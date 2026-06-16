import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/**
 * 启动时关键环境变量校验 —— 缺/弱直接抛错,不让服务带病起跑
 *
 * 必填(全部环境):   启动就会用的,JWT / DB
 * 必填(production): 生产安全相关的,CORS 白名单
 * 弱校验(全部):      长度 / 强度不足时 warn(不抛)
 *
 * 设计原则:
 *  - 必填项缺失/还是 .env.example 默认值 → 抛 Error,启动失败
 *  - 强度不足 → warn,不阻塞(开发环境可能用短 secret)
 *  - 错误信息精确到变量名 + 原因,新人能直接定位
 */

interface RequiredSpec {
  key: string;
  desc: string;
  /** 最小长度,缺省不校验 */
  minLength?: number;
  /** 占位符前缀,出现即视为"还没改 .env.example 默认值" */
  placeholderPrefix?: string;
}

const REQUIRED_IN_ALL: RequiredSpec[] = [
  { key: 'JWT_SECRET', minLength: 32, placeholderPrefix: 'replace-with', desc: 'JWT 签名密钥,HS256 至少 32 字符' },
  { key: 'DATABASE_URL', desc: 'PostgreSQL 连接串(Prisma 用)' },
];

const REQUIRED_IN_PRODUCTION: RequiredSpec[] = [
  { key: 'APP_CORS_ORIGINS', desc: '生产必须显式声明允许的跨域来源(逗号分隔)' },
];

export interface EnvCheckResult {
  ok: boolean;
  missing: string[];
  weak: string[];
}

export function checkRequiredEnv(config: ConfigService, isProduction: boolean): EnvCheckResult {
  const missing: string[] = [];
  const weak: string[] = [];
  const all = [...REQUIRED_IN_ALL, ...(isProduction ? REQUIRED_IN_PRODUCTION : [])];

  for (const spec of all) {
    const v = config.get<string>(spec.key);
    const isEmpty = !v || v.trim() === '';
    const isPlaceholder = !isEmpty && spec.placeholderPrefix && v.startsWith(spec.placeholderPrefix);

    if (isEmpty || isPlaceholder) {
      missing.push(`${spec.key}: ${spec.desc}${isPlaceholder ? '(还是 .env.example 默认值)' : ''}`);
      continue;
    }
    if (spec.minLength && v.length < spec.minLength) {
      weak.push(`${spec.key}: 长度 ${v.length} < ${spec.minLength}`);
    }
  }

  return { ok: missing.length === 0, missing, weak };
}

/**
 * 在 main.ts bootstrap 里调用,缺关键变量直接抛错
 * 强度不足只 warn,不阻塞
 */
export function assertRequiredEnv(config: ConfigService): void {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const result = checkRequiredEnv(config, isProduction);
  const logger = new Logger('ConfigCheck');

  if (result.missing.length > 0) {
    logger.error('❌ 缺少关键环境变量,启动中止:');
    for (const m of result.missing) logger.error(`   - ${m}`);
    logger.error('请参考 apps/api/.env.example 配置');
    throw new Error(`Missing required env vars: ${result.missing.join('; ')}`);
  }

  if (result.weak.length > 0) {
    logger.warn('⚠️  环境变量强度不足(开发可忽略,生产请改):');
    for (const w of result.weak) logger.warn(`   - ${w}`);
  }

  logger.log(`✅ 关键环境变量校验通过 (${isProduction ? 'production' : 'development'})`);
}
