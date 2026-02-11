'use client';

import { useMemo, useState } from 'react';
import { getTerrainAction } from './actions';
import { ScreepsShard } from '@/lib/constants';
import TerrainMap, { Building, BuildingType, RoomTerrain, ViewPosition } from '@/components/TerrainMap';
import { roomNameToXY, xyToRoomName } from '@/lib/mapUtils';


export default function TerrainPage() {
    const [room, setRoom] = useState('W0N0');
    const [shard, setShard] = useState<ScreepsShard>(ScreepsShard.Shard3);
    const [rooms, setRooms] = useState<RoomTerrain[]>([]);
    const [loading, setLoading] = useState(false);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [viewScale, setViewScale] = useState(78.26);
    const [viewPos, setViewPos] = useState<ViewPosition>({
        x: 20.924,
        y: 52.391,
    });
    const [newBuilding, setNewBuilding] = useState({
        type: 'spawn' as BuildingType,
        roomName: room,
        x: 25,
        y: 25,
    });

    const roomOptions = useMemo(() => rooms.map((roomData) => roomData.roomName), [rooms]);

    const handleFetch = async () => {
        setLoading(true);
        const radius = viewScale > 100 ? 1 : 2;
        const center = roomNameToXY(room);
        const neighborRooms = createRoomGrid(center.x, center.y, radius);
        const results = await Promise.all(
            neighborRooms.map((name) => getTerrainAction(name, shard))
        );
        const nextRooms: RoomTerrain[] = [];
        const errors: string[] = [];
        results.forEach((result, index) => {
            if (result.success) {
                nextRooms.push({ roomName: neighborRooms[index], terrain: result.data! });
            } else {
                errors.push(`${neighborRooms[index]}: ${result.error}`);
            }
        });
        setRooms(nextRooms);
        setBuildings([]);
        if (nextRooms.length) {
            setNewBuilding((prev) => ({
                ...prev,
                roomName: nextRooms[0].roomName,
            }));
        } else {
            setNewBuilding((prev) => ({ ...prev, roomName: '' }));
        }
        setViewPos({
            x: center.x + 0.5,
            y: center.y + 0.5,
        });
        if (errors.length) {
            alert(`部分房间加载失败:\n${errors.join('\n')}`);
        }
        setLoading(false);
    };

    // 演示功能：生成模拟地形数据
    const handleDemo = () => {
        const centerRoom = 'W0N0';
        const center = roomNameToXY(centerRoom);
        const demoRooms: RoomTerrain[] = createRoomGrid(center.x, center.y, 2).map((name) => ({
            roomName: name,
            terrain: generateDemoTerrain(),
        }));
        setRooms(demoRooms);
        setRoom(centerRoom);
        setNewBuilding((prev) => ({
            ...prev,
            roomName: centerRoom,
        }));
        setViewPos({
            x: center.x + 0.5,
            y: center.y + 0.5,
        });
        setBuildings([
            {
                id: 'demo-spawn',
                type: 'spawn',
                roomName: centerRoom,
                x: 24,
                y: 24,
                hp: 5000,
            },
            {
                id: 'demo-tower',
                type: 'tower',
                roomName: centerRoom,
                x: 20,
                y: 30,
                hp: 3000,
            },
        ]);
    };

    const handleAddBuilding = () => {
        if (!newBuilding.roomName) return;
        const id = `${newBuilding.type}-${Date.now()}`;
        setBuildings((prev) => [
            ...prev,
            {
                id,
                type: newBuilding.type,
                roomName: newBuilding.roomName,
                x: clampCoordinate(newBuilding.x),
                y: clampCoordinate(newBuilding.y),
            },
        ]);
    };

    const handleViewChange = (position: ViewPosition, scale: number) => {
        setViewPos(position);
        setViewScale(scale);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Screeps 全景地形 & 建筑面板</h1>
                    <p className="text-sm text-gray-400">
                        组合临近房间为一个大型地图，轻松规划建筑与路线。
                    </p>
                </div>
                
                {/* 控制面板 */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg backdrop-blur">
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
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                        >
                            {loading ? '加载中...' : '获取地形'}
                        </button>
                        
                        <button
                            onClick={handleDemo}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md font-medium transition-colors"
                        >
                            🎮 演示模式
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg backdrop-blur">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[140px] flex-1">
                            <label className="block text-sm font-medium mb-2">建筑类型</label>
                            <select
                                value={newBuilding.type}
                                onChange={(e) =>
                                    setNewBuilding((prev) => ({
                                        ...prev,
                                        type: e.target.value as BuildingType,
                                    }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="spawn">Spawn</option>
                                <option value="tower">Tower</option>
                                <option value="extension">Extension</option>
                            </select>
                        </div>
                        <div className="min-w-[160px] flex-1">
                            <label className="block text-sm font-medium mb-2">目标房间</label>
                            <select
                                value={roomOptions.length ? newBuilding.roomName : ''}
                                onChange={(e) =>
                                    setNewBuilding((prev) => ({ ...prev, roomName: e.target.value }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {roomOptions.length ? (
                                    roomOptions.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">先加载地图</option>
                                )}
                            </select>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-sm font-medium mb-2">X 坐标</label>
                            <input
                                type="number"
                                min={0}
                                max={49}
                                value={newBuilding.x}
                                onChange={(e) =>
                                    setNewBuilding((prev) => ({
                                        ...prev,
                                        x: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="min-w-[120px]">
                            <label className="block text-sm font-medium mb-2">Y 坐标</label>
                            <input
                                type="number"
                                min={0}
                                max={49}
                                value={newBuilding.y}
                                onChange={(e) =>
                                    setNewBuilding((prev) => ({
                                        ...prev,
                                        y: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={handleAddBuilding}
                            disabled={!roomOptions.length}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
                        >
                            ➕ 添加建筑
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg backdrop-blur">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[160px] flex-1">
                            <label className="block text-sm font-medium mb-2">pos.x</label>
                            <input
                                type="number"
                                step="0.001"
                                value={viewPos.x}
                                onChange={(e) =>
                                    setViewPos((prev) => ({
                                        ...prev,
                                        x: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="min-w-[160px] flex-1">
                            <label className="block text-sm font-medium mb-2">pos.y</label>
                            <input
                                type="number"
                                step="0.001"
                                value={viewPos.y}
                                onChange={(e) =>
                                    setViewPos((prev) => ({
                                        ...prev,
                                        y: Number(e.target.value),
                                    }))
                                }
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="min-w-[160px] flex-1">
                            <label className="block text-sm font-medium mb-2">scale</label>
                            <input
                                type="number"
                                step="0.01"
                                value={viewScale}
                                onChange={(e) => setViewScale(Number(e.target.value))}
                                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="text-xs text-gray-400 max-w-[260px]">
                            scale &gt; 100 显示房间细节，scale ≤ 100 显示绿点概览
                        </div>
                    </div>
                </div>

                {/* 地形地图显示区域 */}
                <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-4 shadow-lg">
                    {rooms.length ? (
                        <TerrainMap
                            rooms={rooms}
                            buildings={buildings}
                            viewScale={viewScale}
                            viewPos={viewPos}
                            onViewChange={handleViewChange}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-96 text-gray-400">
                            <div className="text-center">
                                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                                <p className="text-lg">输入房间名称并点击“获取地形”按钮开始</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function generateDemoTerrain() {
    let demoTerrain = '';
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            if (x === 0 || x === 49 || y === 0 || y === 49) {
                demoTerrain += '1';
            } else {
                const rand = Math.random();
                if (rand < 0.1) {
                    demoTerrain += '1';
                } else if (rand < 0.25) {
                    demoTerrain += '2';
                } else {
                    demoTerrain += '0';
                }
            }
        }
    }
    return demoTerrain;
}

function clampCoordinate(value: number) {
    if (Number.isNaN(value)) return 0;
    return Math.min(49, Math.max(0, value));
}

function createRoomGrid(centerX: number, centerY: number, radius: number) {
    const rooms: string[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            rooms.push(xyToRoomName(centerX + dx, centerY + dy));
        }
    }
    return rooms;
}
