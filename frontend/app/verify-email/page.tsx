"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { verifyEmail, resendVerificationEmail } from "@/services/authService"
import { useAuth } from "@/contexts/AuthContext"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "idle">("idle")
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      setStatus("verifying")
      verifyEmail(token)
        .then(() => {
          setStatus("success")
          refreshUser()
        })
        .catch((err) => {
          setStatus("error")
          setError(err.message || "Verification failed")
        })
    }
  }, [searchParams, refreshUser])

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email address")
      return
    }
    setResending(true)
    setError("")
    try {
      await resendVerificationEmail(email)
      setStatus("success")
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20">
            {status === "verifying" && (
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Verifying Email...</h1>
                <p className="text-gray-400">Please wait</p>
              </div>
            )}
            {status === "success" && (
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4 text-green-400">Email Verified!</h1>
                <p className="mb-4">Your email has been successfully verified.</p>
                <Link
                  href="/"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Go to Home
                </Link>
              </div>
            )}
            {status === "error" && (
              <div>
                <h1 className="text-2xl font-bold mb-4 text-red-400">Verification Failed</h1>
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                      placeholder="Enter your email"
                    />
                  </div>
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg"
                  >
                    {resending ? "Sending..." : "Resend Verification Email"}
                  </button>
                </div>
              </div>
            )}
            {status === "idle" && (
              <div>
                <h1 className="text-2xl font-bold mb-4">Verify Your Email</h1>
                <p className="mb-4 text-gray-400">
                  Please check your email for the verification link, or enter your email to resend.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg"
                      placeholder="Enter your email"
                    />
                  </div>
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg"
                  >
                    {resending ? "Sending..." : "Resend Verification Email"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

