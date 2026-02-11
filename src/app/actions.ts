'use server'; // 标记为服务端动作

import { ScreepsShard } from '@/lib/constants';
import { fetchRoomTerrain } from '@/services/terrain';


/**
 * 供前端调用的 Action
 * 注释：封装后端逻辑，直接返回数据给组件
 */
export async function getTerrainAction(roomName: string, shard: ScreepsShard) {
    try {
        const terrain = await fetchRoomTerrain(roomName, shard);
        return { success: true, data: terrain };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}