import { createReadStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import * as BunnyStorageSDK from '@bunny.net/storage-sdk'
import { createLogger } from '../logging/logger.js'
import { resolveGeneratedImagePath } from './imageGeneration.js'

const imageUploadLogger = createLogger({ component: 'image-upload-service' })

const STORAGE_REGIONS = {
    Falkenstein: BunnyStorageSDK.regions.StorageRegion.Falkenstein,
    de: BunnyStorageSDK.regions.StorageRegion.Falkenstein,
    London: BunnyStorageSDK.regions.StorageRegion.London,
    UK: BunnyStorageSDK.regions.StorageRegion.London,
    uk: BunnyStorageSDK.regions.StorageRegion.London,
    NewYork: BunnyStorageSDK.regions.StorageRegion.NewYork,
    NY: BunnyStorageSDK.regions.StorageRegion.NewYork,
    ny: BunnyStorageSDK.regions.StorageRegion.NewYork,
    LosAngeles: BunnyStorageSDK.regions.StorageRegion.LosAngeles,
    LA: BunnyStorageSDK.regions.StorageRegion.LosAngeles,
    la: BunnyStorageSDK.regions.StorageRegion.LosAngeles,
    Singapore: BunnyStorageSDK.regions.StorageRegion.Singapore,
    SG: BunnyStorageSDK.regions.StorageRegion.Singapore,
    sg: BunnyStorageSDK.regions.StorageRegion.Singapore,
    Stockholm: BunnyStorageSDK.regions.StorageRegion.Stockholm,
    SE: BunnyStorageSDK.regions.StorageRegion.Stockholm,
    se: BunnyStorageSDK.regions.StorageRegion.Stockholm,
    SaoPaulo: BunnyStorageSDK.regions.StorageRegion.SaoPaulo,
    BR: BunnyStorageSDK.regions.StorageRegion.SaoPaulo,
    br: BunnyStorageSDK.regions.StorageRegion.SaoPaulo,
    Johannesburg: BunnyStorageSDK.regions.StorageRegion.Johannesburg,
    JH: BunnyStorageSDK.regions.StorageRegion.Johannesburg,
    jh: BunnyStorageSDK.regions.StorageRegion.Johannesburg,
    Sydney: BunnyStorageSDK.regions.StorageRegion.Sydney,
    SYD: BunnyStorageSDK.regions.StorageRegion.Sydney,
    syd: BunnyStorageSDK.regions.StorageRegion.Sydney
} as const

interface UploadGeneratedImageInput {
    filename: string
    storageKey: string
    contentType?: string
}

function getStorageZone() {
    const zoneName = process.env.BUNNY_STORAGE_ZONE_NAME?.trim()
    const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY?.trim()
    const configuredRegion = process.env.BUNNY_STORAGE_REGION?.trim() || 'Falkenstein'
    const region = STORAGE_REGIONS[configuredRegion as keyof typeof STORAGE_REGIONS]

    if (!zoneName) {
        throw new Error('BUNNY_STORAGE_ZONE_NAME is not configured')
    }

    if (!accessKey) {
        throw new Error('BUNNY_STORAGE_ACCESS_KEY is not configured')
    }

    if (!region) {
        throw new Error(`Unsupported BUNNY_STORAGE_REGION: ${configuredRegion}`)
    }

    return BunnyStorageSDK.zone.connect_with_accesskey(region, zoneName, accessKey)
}

function normalizeRemotePath(storageKey: string): string {
    return `/${storageKey}`.replace(/\/+/g, '/').replace(/\/\/+/, '/')
}

export async function uploadGeneratedImage({
    filename,
    storageKey,
    contentType = 'image/png'
}: UploadGeneratedImageInput): Promise<void> {
    const filePath = resolveGeneratedImagePath(filename)
    const storageZone = getStorageZone()
    const remotePath = normalizeRemotePath(storageKey)

    imageUploadLogger.info('vehicle_image.upload_started', {
        filename,
        storageKey: remotePath
    })

    const fileStream = createReadStream(filePath)
    const webStream = Readable.toWeb(fileStream) as NodeReadableStream<Uint8Array>

    await BunnyStorageSDK.file.upload(storageZone, remotePath, webStream, {
        contentType
    })

    imageUploadLogger.info('vehicle_image.upload_completed', {
        filename,
        storageKey: remotePath
    })

    await unlink(filePath).catch(error => {
        imageUploadLogger.warn('vehicle_image.tmp_cleanup_failed', {
            filename,
            error
        })
    })
}
