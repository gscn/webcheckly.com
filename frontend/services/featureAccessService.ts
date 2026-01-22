import { authenticatedFetch, getAccessToken } from './authService'
import { getCreditsBalance, type UserCredits } from './creditsService'
import { getFeaturePricing, type FeaturePricing } from './pricingService'
import { getUserSubscription, type Subscription } from './pricingService'
import { API_BASE_URL } from '@/utils/config'

// 功能访问检查结果
export interface FeatureAccessResult {
  canAccess: boolean
  reason?: 'not_logged_in' | 'insufficient_credits' | 'free' | 'available'
  creditsRequired?: number
  currentCredits?: number
  message?: string
}

/**
 * 检查用户对指定功能的访问权限
 * @param featureCode 功能代码（如 'ai-analysis', 'performance' 等）
 * @returns 功能访问检查结果
 */
export async function checkFeatureAccess(featureCode: string): Promise<FeatureAccessResult> {
  // 获取功能定价信息
  let featurePricing: FeaturePricing | null = null
  try {
    const allPricing = await getFeaturePricing()
    featurePricing = allPricing.find(p => p.feature_code === featureCode) || null
  } catch (error) {
    console.error('[FeatureAccess] Failed to get feature pricing:', error)
    // 如果获取定价失败，假设是基础功能（免费）
    return {
      canAccess: true,
      reason: 'free',
      message: 'Feature pricing unavailable, assuming free'
    }
  }

  // 如果没有找到功能定价，假设是基础功能（免费）
  if (!featurePricing) {
    return {
      canAccess: true,
      reason: 'free',
      message: 'Feature not found in pricing, assuming free'
    }
  }

  // 基础功能免费
  if (featurePricing.feature_category === 'basic' || featurePricing.credits_cost === 0) {
    return {
      canAccess: true,
      reason: 'free',
      creditsRequired: 0
    }
  }

  // 检查是否登录
  const token = getAccessToken()
  if (!token) {
    return {
      canAccess: false,
      reason: 'not_logged_in',
      creditsRequired: featurePricing.credits_cost,
      message: 'Login required to use this feature'
    }
  }

  // 获取用户积分和订阅信息
  let credits: UserCredits | null = null
  let subscription: Subscription | null = null

  try {
    [credits, subscription] = await Promise.all([
      getCreditsBalance().catch(() => null),
      getUserSubscription().catch(() => null)
    ])
  } catch (error) {
    console.error('[FeatureAccess] Failed to get user info:', error)
    // 如果获取用户信息失败，假设无法访问
    return {
      canAccess: false,
      reason: 'insufficient_credits',
      creditsRequired: featurePricing.credits_cost,
      message: 'Failed to verify access'
    }
  }

  if (!credits) {
    return {
      canAccess: false,
      reason: 'insufficient_credits',
      creditsRequired: featurePricing.credits_cost,
      currentCredits: 0,
      message: 'Failed to get credits balance'
    }
  }

  // 检查订阅用户
  if (subscription && subscription.status === 'active') {
    // 订阅用户：检查月度限额和积分余额
    // 这里简化处理，实际应该检查月度限额
    if (credits.credits >= featurePricing.credits_cost) {
      return {
        canAccess: true,
        reason: 'available',
        creditsRequired: featurePricing.credits_cost,
        currentCredits: credits.credits
      }
    }
  }

  // 检查积分余额
  if (credits.credits >= featurePricing.credits_cost) {
    return {
      canAccess: true,
      reason: 'available',
      creditsRequired: featurePricing.credits_cost,
      currentCredits: credits.credits
    }
  }

  // 积分不足
  return {
    canAccess: false,
    reason: 'insufficient_credits',
    creditsRequired: featurePricing.credits_cost,
    currentCredits: credits.credits,
    message: `Insufficient credits. Need ${featurePricing.credits_cost}, have ${credits.credits}`
  }
}

/**
 * 批量检查多个功能的访问权限
 * @param featureCodes 功能代码数组
 * @returns 功能访问检查结果映射
 */
export async function checkMultipleFeatures(
  featureCodes: string[]
): Promise<Record<string, FeatureAccessResult>> {
  const results: Record<string, FeatureAccessResult> = {}
  
  // 并行检查所有功能
  const promises = featureCodes.map(async (code) => {
    const result = await checkFeatureAccess(code)
    return { code, result }
  })

  const checked = await Promise.all(promises)
  checked.forEach(({ code, result }) => {
    results[code] = result
  })

  return results
}
