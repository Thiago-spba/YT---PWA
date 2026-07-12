import { useContext, createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { getAuthInstance } from '../config/firebase'
import { onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut, type UserCredential } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInAnonymously: () => Promise<UserCredential | null>
  signOut: () => Promise<void>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuthInstance()

    // Listener para mudanças de estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    // Se não houver usuário, tenta login anônimo automaticamente
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error('Erro no login anônimo:', error)
        setLoading(false)
      })
    }

    return () => unsubscribe()
  }, [])

  const signInAnonymouslyFn = useCallback(async (): Promise<UserCredential | null> => {
    try {
      const auth = getAuthInstance()
      return auth.currentUser
        ? { user: auth.currentUser, operationType: 'signIn' as const, providerId: null }
        : await signInAnonymously(auth)
    } catch (error) {
      console.error('Erro ao fazer login anônimo:', error)
      return null
    }
  }, [])

  const signOutFn = useCallback(async (): Promise<void> => {
    try {
      const auth = getAuthInstance()
      await firebaseSignOut(auth)
      // Login anônimo automático após logout
      await signInAnonymously(auth)
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }, [])

  const refreshTokenFn = useCallback(async (): Promise<string | null> => {
    try {
      const auth = getAuthInstance()
      if (!auth.currentUser) return null
      return await auth.currentUser.getIdToken(true)
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      return null
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signInAnonymously: signInAnonymouslyFn, signOut: signOutFn, refreshToken: refreshTokenFn }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// Hook opcional para aguardar autenticação pronta
export function useAuthReady(): { user: User | null; ready: boolean } {
  const { user, loading } = useAuth()
  return { user, ready: !loading }
}

// Hook para obter ID token atual (útil para chamadas de API autenticadas)
export function useIdToken(): string | null {
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setToken(null)
      return
    }
    user.getIdToken().then(setToken).catch(() => setToken(null))
    const interval = setInterval(() => user.getIdToken().then(setToken).catch(() => setToken(null)), 50 * 60 * 1000) // 50min
    return () => clearInterval(interval)
  }, [user])

  return token
}