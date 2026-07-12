import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type Firestore,
  type DocumentReference,
} from 'firebase/firestore'
import { getFirestoreDb, isFirebaseConfigured } from '../config/firebase'
import type { VideoProgress, VideoProgressDoc } from '../types'
export type { VideoProgress } from '../types'

const SYNC_INTERVAL_MS = 10_000 // 10 seconds
const SYNC_THRESHOLD_MS = 1_000 // Only sync if progress changed by at least 1 second

let syncInterval: ReturnType<typeof setInterval> | null = null
let lastSyncedTime = 0
let pendingProgress: VideoProgress | null = null
let currentDb: Firestore | null = null
let currentUserId: string | null = null
let currentVideoId: string | null = null
let currentVideoDuration = 0

/**
 * Inicializa o sincronizador de progresso com Firestore
 * Deve ser chamado quando o usuário autenticar e/ou ao iniciar um vídeo
 */
export function initProgressSync(
  db: Firestore = getFirestoreDb(),
  userId: string,
  videoId: string,
  duration: number,
): void {
  if (!isFirebaseConfigured()) {
    console.warn('[ProgressSync] Firebase não configurado - sincronização desabilitada')
    return
  }

  currentDb = db
  currentUserId = userId
  currentVideoId = videoId
  currentVideoDuration = duration
  lastSyncedTime = 0
  pendingProgress = null

  // Limpa intervalo anterior se existir
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }

  // Carrega progresso salvo anteriormente
  loadSavedProgress().catch(console.error)

  // Inicia sincronização periódica (a cada 10 segundos)
  syncInterval = setInterval(() => {
    if (pendingProgress && currentVideoId && currentUserId && currentDb) {
      syncProgressToFirestore(currentDb, currentUserId, currentVideoId, pendingProgress)
    }
  }, SYNC_INTERVAL_MS)

  console.log('[ProgressSync] Sincronização iniciada:', { videoId, userId, interval: SYNC_INTERVAL_MS })
}

/**
 * Atualiza o progresso atual do vídeo (chamado periodicamente pelo player)
 * Só sincroniza de verdade a cada 10 segundos (via intervalo) ou quando o vídeo termina
 */
export function updateProgress(currentTime: number, duration: number, completed = false): void {
  if (!currentVideoId || !currentUserId) return

  currentVideoDuration = duration

  // Só atualiza o progresso pendente se mudou significativamente (threshold de 1s)
  if (Math.abs(currentTime - lastSyncedTime) >= SYNC_THRESHOLD_MS || completed) {
    pendingProgress = {
      videoId: currentVideoId,
      userId: currentUserId,
      currentTime,
      duration,
      updatedAt: Date.now(),
      completed,
    }
  }
}

/**
 * Força sincronização imediata (ex: ao pausar, terminar vídeo ou sair da página)
 */
export async function flushProgress(): Promise<void> {
  if (!pendingProgress || !currentDb || !currentUserId || !currentVideoId) return

  await syncProgressToFirestore(currentDb, currentUserId, currentVideoId, pendingProgress)
  lastSyncedTime = pendingProgress.currentTime
  pendingProgress = null
}

/**
 * Carrega o progresso salvo do Firestore para retomar reprodução
 */
export async function loadSavedProgress(): Promise<VideoProgress | null> {
  if (!isFirebaseConfigured() || !currentUserId || !currentVideoId) return null

  try {
    const db = getFirestoreDb()
    const docRef = doc(db, 'users', currentUserId, 'videoProgress', currentVideoId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      console.log('[ProgressSync] Nenhum progresso salvo encontrado')
      return null
    }

    const data = snapshot.data() as VideoProgressDoc
    const updatedAtValue = data.updatedAt instanceof Date ? data.updatedAt.getTime() :
      typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt ? data.updatedAt.toDate().getTime() :
      data.updatedAt
    
    const progress: VideoProgress = {
      videoId: data.videoId,
      userId: data.userId,
      currentTime: data.currentTime,
      duration: data.duration,
      updatedAt: updatedAtValue,
      completed: data.completed,
    }

    console.log('[ProgressSync] Progresso carregado:', progress)
    return progress
  } catch (error) {
    console.error('[ProgressSync] Erro ao carregar progresso:', error)
    return null
  }
}

/**
 * Limpa o progresso salvo (ex: quando vídeo é marcado como concluído e assistido novamente)
 */
export async function clearSavedProgress(): Promise<void> {
  if (!isFirebaseConfigured() || !currentUserId || !currentVideoId) return

  try {
    const db = getFirestoreDb()
    const docRef = doc(db, 'users', currentUserId, 'videoProgress', currentVideoId)
    await setDoc(docRef, {
      videoId: currentVideoId,
      userId: currentUserId,
      currentTime: 0,
      duration: currentVideoDuration,
      updatedAt: serverTimestamp(),
      completed: false,
    })
    console.log('[ProgressSync] Progresso limpo')
  } catch (error) {
    console.error('[ProgressSync] Erro ao limpar progresso:', error)
  }
}

/**
 * Para a sincronização periódica e limpa recursos
 * Deve ser chamado ao sair do player ou trocar de vídeo
 */
export function stopProgressSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }

  // Faz flush final se houver progresso pendente
  if (pendingProgress) {
    flushProgress().catch(console.error)
  }

  currentDb = null
  currentUserId = null
  currentVideoId = null
  currentVideoDuration = 0
  lastSyncedTime = 0
  pendingProgress = null

  console.log('[ProgressSync] Sincronização parada')
}

/**
 * Função interna que faz o write real no Firestore
 * RASCUNHO: Função para sincronizar tempo de progresso no Firestore a cada 10 segundos
 * Estrutura no Firestore: users/{userId}/videoProgress/{videoId}
 */
async function syncProgressToFirestore(
  db: Firestore,
  userId: string,
  videoId: string,
  progress: VideoProgress,
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'videoProgress', videoId)
    await setDoc(docRef, {
      videoId: progress.videoId,
      userId: progress.userId,
      currentTime: progress.currentTime,
      duration: progress.duration,
      updatedAt: serverTimestamp(),
      completed: progress.completed,
    }, { merge: true })

    lastSyncedTime = progress.currentTime
    console.log('[ProgressSync] Progresso sincronizado:', {
      videoId,
      currentTime: progress.currentTime,
      completed: progress.completed,
    })
  } catch (error) {
    console.error('[ProgressSync] Erro ao sincronizar progresso:', error)
    // Não re-throw para não quebrar a reprodução
  }
}

/**
 * Hook React para gerenciar sincronização de progresso (para uso em componentes React)
 * RASCUNHO: Hook personalizado para gerenciar estado de sincronização
 */
export function useProgressSync(
  _userId: string | null,
  _videoId: string | null,
  _duration: number,
  _currentTime: number,
  _isPlaying: boolean,
  _isCompleted: boolean,
) {
  // Este hook será implementado no componente VideoPlayer
  // Aqui fica apenas a tipagem/assinatura para referência
}

/**
 * Função auxiliar para criar estrutura de dados de progresso no Firestore
 * Coleção: users/{userId}/videoProgress/{videoId}
 * Campos:
 * - videoId: string
 * - userId: string
 * - currentTime: number (segundos)
 * - duration: number (segundos)
 * - updatedAt: Timestamp (server timestamp)
 * - completed: boolean
 */
export function getProgressDocRef(db: Firestore, userId: string, videoId: string): DocumentReference {
  return doc(db, 'users', userId, 'videoProgress', videoId)
}

/**
 * Função auxiliar para ler progresso salvo
 * RASCUNHO: Função para buscar progresso salvo no Firestore
 */
export async function getSavedProgress(db: Firestore, userId: string, videoId: string): Promise<VideoProgressDoc | null> {
  try {
    const docRef = getProgressDocRef(db, userId, videoId)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data() as VideoProgressDoc) : null
  } catch (error) {
    console.error('[ProgressSync] Erro ao buscar progresso:', error)
    return null
  }
}