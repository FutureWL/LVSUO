import { SetMetadata } from '@nestjs/common';

/**
 * 标记公共接口,跳过 JwtAuthGuard
 */
export const IS_PUBLIC_KEY = 'lmsuo:public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
