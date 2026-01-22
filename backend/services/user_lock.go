package services

import (
	"fmt"
	"hash/fnv"
	"log"
	"sync"
	"sync/atomic"
	"time"
	"web-checkly/database"
)

// 用户锁管理器（使用内存锁 + 数据库 advisory lock 双重保护）
type userLockManager struct {
	locks map[string]*userLockEntry
	mu    sync.RWMutex
}

// userLockEntry 用户锁条目（包含锁和释放状态）
type userLockEntry struct {
	mutex       sync.Mutex
	released    int32     // 原子操作：0=未释放，1=已释放
	releaseOnce sync.Once // 确保只释放一次
}

var userLocks = &userLockManager{
	locks: make(map[string]*userLockEntry),
}

// getLock 获取用户的内存锁条目
func (m *userLockManager) getLock(userID string) *userLockEntry {
	m.mu.Lock()
	defer m.mu.Unlock()

	if entry, exists := m.locks[userID]; exists {
		return entry
	}

	entry := &userLockEntry{}
	m.locks[userID] = entry
	return entry
}

// hashUserID 将用户ID转换为整数（用于 PostgreSQL advisory lock）
func hashUserID(userID string) int64 {
	h := fnv.New64a()
	h.Write([]byte(userID))
	return int64(h.Sum64())
}

// IsUserLockHeld 检查用户锁是否被占用（用于调试）
// 注意：这个函数主要用于调试，不应该作为判断锁是否可用的依据
// 因为新创建的锁条目，released=0（零值），mutex未锁定，但这个状态不应该被视为"锁被占用"
func IsUserLockHeld(userID string) bool {
	userLocks.mu.RLock()
	lockEntry, exists := userLocks.locks[userID]
	userLocks.mu.RUnlock()

	if !exists {
		return false
	}

	// 检查是否已释放标记
	released := atomic.LoadInt32(&lockEntry.released)
	if released == 1 {
		// 已释放，锁未被占用
		return false
	}

	// 尝试获取锁，如果成功说明锁未被占用（可能是新创建的条目）
	if lockEntry.mutex.TryLock() {
		lockEntry.mutex.Unlock()
		return false
	}

	// 如果无法获取mutex锁，且released=0，说明锁被占用
	return true
}

// ForceReleaseUserTaskLock 强制释放用户锁（用于紧急情况）
func ForceReleaseUserTaskLock(userID string) error {
	userLocks.mu.Lock()
	defer userLocks.mu.Unlock()

	// 删除锁条目（强制清理）
	delete(userLocks.locks, userID)

	// 释放数据库 advisory lock
	lockID := hashUserID(userID)
	query := `SELECT pg_advisory_unlock($1)`
	var released bool
	err := database.GetDB().QueryRow(query, lockID).Scan(&released)
	if err != nil {
		log.Printf("[UserLock] Warning: Failed to force release database lock for user %s: %v", userID, err)
	} else if released {
		log.Printf("[UserLock] Force released lock for user %s", userID)
	}

	return nil
}

// AcquireUserTaskLock 获取用户任务创建锁（防止同一用户并发创建任务）
// 返回 true 表示成功获取锁，false 表示锁已被占用
func AcquireUserTaskLock(userID string) (bool, error) {
	// 1. 检查并获取锁条目
	// 如果锁已经被释放（released=1），需要创建新的条目（因为 sync.Once 不能重置）
	userLocks.mu.Lock()
	lockEntry, exists := userLocks.locks[userID]
	wasNewlyCreated := false
	if exists && atomic.LoadInt32(&lockEntry.released) == 1 {
		// 锁已经被释放，创建新的条目
		lockEntry = &userLockEntry{}
		userLocks.locks[userID] = lockEntry
		wasNewlyCreated = true
		log.Printf("[UserLock] Created new lock entry for user %s (previous was released)", userID)
	} else if !exists {
		// 不存在，创建新条目
		lockEntry = &userLockEntry{}
		userLocks.locks[userID] = lockEntry
		wasNewlyCreated = true
	}
	userLocks.mu.Unlock()

	// 2. 尝试获取内存锁
	if !lockEntry.mutex.TryLock() {
		// 内存锁已被占用，说明用户正在创建任务
		log.Printf("[UserLock] Lock already held for user %s (memory lock)", userID)
		return false, nil
	}

	// 3. 获取数据库 advisory lock（防止跨进程/跨实例的并发）
	lockID := hashUserID(userID)
	query := `SELECT pg_try_advisory_lock($1)`
	var acquired bool
	err := database.GetDB().QueryRow(query, lockID).Scan(&acquired)
	if err != nil {
		lockEntry.mutex.Unlock() // 释放内存锁
		return false, fmt.Errorf("failed to acquire database lock: %w", err)
	}

	if !acquired {
		lockEntry.mutex.Unlock() // 释放内存锁
		log.Printf("[UserLock] Lock already held for user %s (database lock)", userID)

		// 如果是新创建的锁条目，但数据库锁被占用，可能是上次程序异常退出导致的残留锁
		// 在这种情况下，尝试强制释放数据库锁
		if wasNewlyCreated {
			log.Printf("[UserLock] Database lock held but this is a newly created lock entry for user %s, attempting to force release (may be leftover from previous session)", userID)
			// 强制释放数据库锁（只清理数据库锁，不清理内存条目，因为我们已经释放了内存锁）
			lockID := hashUserID(userID)
			query := `SELECT pg_advisory_unlock($1)`
			var released bool
			if unlockErr := database.GetDB().QueryRow(query, lockID).Scan(&released); unlockErr == nil && released {
				log.Printf("[UserLock] Force released leftover database lock for user %s", userID)
			}
		}

		return false, nil
	}

	// 标记为未释放
	atomic.StoreInt32(&lockEntry.released, 0)
	log.Printf("[UserLock] Acquired lock for user %s", userID)

	// 成功获取锁，设置自动释放（30秒后自动释放，防止死锁）
	// 正常情况下，锁应该在任务创建成功后立即释放（几秒内）
	go func() {
		time.Sleep(30 * time.Second)
		// 检查锁是否已经被释放
		if atomic.LoadInt32(&lockEntry.released) == 0 {
			// 锁还未被释放，执行自动释放
			releaseUserTaskLockInternal(userID, lockEntry)
			log.Printf("[UserLock] Auto-released lock for user %s after 30 seconds", userID)
		}
	}()

	return true, nil
}

// ReleaseUserTaskLock 释放用户任务创建锁（公开接口）
func ReleaseUserTaskLock(userID string) error {
	lockEntry := userLocks.getLock(userID)
	return releaseUserTaskLockInternal(userID, lockEntry)
}

// releaseUserTaskLockInternal 内部释放锁实现（使用 sync.Once 确保只释放一次）
func releaseUserTaskLockInternal(userID string, lockEntry *userLockEntry) error {
	var releaseErr error
	lockEntry.releaseOnce.Do(func() {
		// 标记为已释放（原子操作）
		atomic.StoreInt32(&lockEntry.released, 1)

		// 1. 释放数据库 advisory lock
		lockID := hashUserID(userID)
		query := `SELECT pg_advisory_unlock($1)`
		var released bool
		err := database.GetDB().QueryRow(query, lockID).Scan(&released)
		if err != nil {
			log.Printf("[UserLock] Warning: Failed to release database lock for user %s: %v", userID, err)
			releaseErr = fmt.Errorf("failed to release database lock: %w", err)
		} else if !released {
			log.Printf("[UserLock] Warning: Lock was not held for user %s", userID)
		} else {
			log.Printf("[UserLock] Released database lock for user %s", userID)
		}

		// 2. 释放内存锁（使用 defer 保护，避免 panic）
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[UserLock] Warning: Panic when releasing memory lock for user %s: %v", userID, r)
				if releaseErr == nil {
					releaseErr = fmt.Errorf("panic when releasing memory lock: %v", r)
				}
			} else {
				log.Printf("[UserLock] Released memory lock for user %s", userID)
			}
		}()
		lockEntry.mutex.Unlock()
	})

	return releaseErr
}
