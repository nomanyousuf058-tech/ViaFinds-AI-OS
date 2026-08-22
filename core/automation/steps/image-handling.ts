import { StepResult, AutomationContext, ImageAsset } from './types';
import { logger } from '../../../lib/logger';
import { UniversalContent } from '../../../core/uco/UniversalContent';
import { ContentType } from '../../../core/uco/ContentType';
import crypto from 'node:crypto';

export class ImageHandlingStep {
  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { assets: [], needsManualUpload: [], uploadedCount: 0, draftQueueCount: 0 },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting image handling', { workflowId: context.workflowId, dryRun: context.dryRun });

    const products = context.uco?.products || context.settings?.products || [];
    if (products.length === 0) {
      result.warnings.push('No products provided for image handling');
      return result;
    }

    const assets: ImageAsset[] = [];
    const needsManualUpload: any[] = [];
    let uploadedCount = 0;

    for (const product of products) {
      const imageUrls = product.images || product.gallery || [];

      if (imageUrls.length === 0) {
        needsManualUpload.push({
          id: product.id || product.uuid,
          name: product.name || product.title,
          reason: 'No images found from partner or product page',
        });
        continue;
      }

      for (const url of imageUrls) {
        try {
          const asset = await this.processImage(url, product, context);
          assets.push(asset);
          if (asset.uploaded) uploadedCount++;
        } catch (err) {
          result.warnings.push(`Failed to process image ${url}: ${(err as Error).message}`);
        }
      }
    }

    result.data.assets = assets;
    result.data.needsManualUpload = needsManualUpload;
    result.data.uploadedCount = uploadedCount;
    result.data.draftQueueCount = needsManualUpload.length;

    logger.info('Image handling completed', {
      workflowId: context.workflowId,
      processed: assets.length,
      uploaded: uploadedCount,
      needsManual: needsManualUpload.length,
    });

    return result;
  }

  private async processImage(url: string, product: any, context: AutomationContext): Promise<ImageAsset> {
    const asset: ImageAsset = {
      url,
      alt: product.name || product.title,
      uploaded: false,
    };

    if (context.dryRun) {
      asset.uploaded = false;
      return asset;
    }

    const storageType = context.imageStorage || 'r2';

    if (storageType === 'r2') {
      const r2Url = await this.uploadToR2(url, product, context);
      asset.storageUrl = r2Url;
      asset.uploaded = !!r2Url;
    } else if (storageType === 's3') {
      const s3Url = await this.uploadToS3(url, product, context);
      asset.storageUrl = s3Url;
      asset.uploaded = !!s3Url;
    }

    return asset;
  }

  private async uploadToR2(url: string, product: any, context: AutomationContext): Promise<string | undefined> {
    try {
      const bucket = context.imageBucket || process.env.R2_BUCKET_NAME;
      if (!bucket) {
        logger.warn('R2_BUCKET_NAME not configured, skipping R2 upload');
        return undefined;
      }

      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Image fetch returned ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `products/${crypto.randomUUID()}.${ext}`;

      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
      });

      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
        ContentType: response.headers.get('content-type') || `image/${ext}`,
      }));

      const publicUrl = `${process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT}/${bucket}/${filename}`;
      logger.info('Image uploaded to R2', { url: publicUrl, productId: product.id || product.uuid });
      return publicUrl;
    } catch (err) {
      logger.error('R2 upload failed', err as Error, { imageUrl: url });
      return undefined;
    }
  }

  private async uploadToS3(url: string, product: any, context: AutomationContext): Promise<string | undefined> {
    try {
      const bucket = process.env.S3_BUCKET_NAME;
      if (!bucket) {
        logger.warn('S3_BUCKET_NAME not configured, skipping S3 upload');
        return undefined;
      }

      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Image fetch returned ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `products/${crypto.randomUUID()}.${ext}`;

      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      });

      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: buffer,
        ContentType: response.headers.get('content-type') || `image/${ext}`,
      }));

      const publicUrl = `https://${bucket}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${filename}`;
      logger.info('Image uploaded to S3', { url: publicUrl, productId: product.id || product.uuid });
      return publicUrl;
    } catch (err) {
      logger.error('S3 upload failed', err as Error, { imageUrl: url });
      return undefined;
    }
  }
}
