'use client';

import { useState } from 'react';
import { getTerrainAction } from './actions';
import { ScreepsShard } from '@/lib/constants';
import TerrainMap from '@/components/TerrainMap';


export default function TerrainPage() {
    const [room, setRoom] = useState('W0N0');
    const [shard, setShard] = useState<ScreepsShard>(ScreepsShard.Shard3);
    const [terrain, setTerrain] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFetch = async () => {
        setLoading(true);
        const result = await getTerrainAction(room, shard);
        if (result.success) {
            setTerrain(result.data!);
        } else {
            alert(`错误: ${result.error}`);
        }
        setLoading(false);
    };

    // 演示功能：生成模拟地形数据
    const handleDemo = () => {
        // 生成一个 50x50 的随机地形
        let demoTerrain = '';
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                // 边界是墙壁
                if (x === 0 || x === 49 || y === 0 || y === 49) {
                    demoTerrain += '1';
                }
                // 随机生成地形
                else {
                    const rand = Math.random();
                    if (rand < 0.1) {
                        demoTerrain += '1'; // 10% 墙壁
                    } else if (rand < 0.25) {
                        demoTerrain += '2'; // 15% 沼泽
                    } else {
                        demoTerrain += '0'; // 75% 平原
                    }
                }
            }
        }
        setTerrain(demoTerrain);
        setRoom('DEMO');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Screeps 地形查看器</h1>
                
                {/* 控制面板 */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-lg">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium mb-2">
                                房间名称
                            </label>
                            <input
                                type="text"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                                placeholder="例如: W0N0"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium mb-2">
                                服务器分片
                            </label>
                            <select
                                value={shard}
                                onChange={(e) => setShard(e.target.value as ScreepsShard)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={ScreepsShard.Shard0}>Shard 0</option>
                                <option value={ScreepsShard.Shard1}>Shard 1</option>
                                <option value={ScreepsShard.Shard2}>Shard 2</option>
                                <option value={ScreepsShard.Shard3}>Shard 3</option>
                            </select>
                        </div>
                        
                        <button
                            onClick={handleFetch}
                            disabled={loading || !room}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                        >
                            {loading ? '加载中...' : '获取地形'}
                        </button>
                        
                        <button
                            onClick={handleDemo}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                        >
                            🎮 演示模式
                        </button>
                    </div>
                </div>

                {/* 地形地图显示区域 */}
                <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
                    {terrain ? (
                        <TerrainMap terrain={terrain} roomName={room} />
                    ) : (
                        <div className="flex items-center justify-center h-96 text-gray-400">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <p className="text-lg">输入房间名称并点击"获取地形"按钮开始</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}