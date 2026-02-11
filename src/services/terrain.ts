import { ScreepsShard } from '@/lib/constants';
import { terrainDb } from '@/lib/db';

/**
 * 从环境变量读取 Token
 * 注释：在 Next.js 服务端代码中可以直接通过 process.env 访问
 */
const SCREEPS_TOKEN = process.env.SCREEPS_TOKEN;

interface TerrainApiResponse {
    terrain: { terrain: string }[];
    ok: number;
}

/**
 * 获取房间地形数据（带 Token 校验和缓存逻辑）
 */
export async function fetchRoomTerrain(room: string, shard: ScreepsShard) {
    // 1. 检查缓存
    const cached = terrainDb.getTerrain(shard, room);
    if (cached) {
        return cached.terrain;
    }

    // 2. 准备请求 URL
    // 注释：Screeps 官方 API 路径，encoded=1 返回压缩后的字符串
    const url = `https://screeps.com/api/game/room-terrain?room=${room}&shard=${shard}&encoded=1`;

    // 3. 发送带 Token 的请求
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            // 携带自定义 Token Header
            'X-Token': SCREEPS_TOKEN || '',
            'Content-Type': 'application/json',
        },
        // 根据需要设置缓存策略，此处选择不使用 Next.js 默认 Fetch 缓存，因为我们已有 SQLite
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data: TerrainApiResponse = await response.json();

    if (data.ok !== 1 || !data.terrain?.length) {
        throw new Error(`Screeps API 错误: 房间 ${room} 可能不存在`);
    }

    const terrainString = data.terrain[0].terrain;

    // 4. 写入 SQLite 缓存
    terrainDb.saveTerrain(shard, room, terrainString);

    return terrainString;
}