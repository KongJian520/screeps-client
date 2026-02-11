'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { ROOM_PX, ROOM_SIZE, TILE_SIZE, roomNameToXY } from '@/lib/mapUtils';

export interface RoomTerrain {
    roomName: string;
    terrain: string;
}

export type BuildingType = 'spawn' | 'tower' | 'extension';

export interface Building {
    id: string;
    type: BuildingType;
    roomName: string;
    x: number;
    y: number;
    hp?: number;
}

interface TerrainMapProps {
    rooms: RoomTerrain[];
    buildings: Building[];
}

// 地形类型常量
const TERRAIN_MASK_WALL = 1;
const TERRAIN_MASK_SWAMP = 2;

// 颜色配置
const COLORS = {
    PLAIN: 0x2b2b2b,      // 平原 - 深灰色
    WALL: 0x111111,       // 墙壁 - 黑色
    SWAMP: 0x1a3a1a,      // 沼泽 - 深绿色
    GRID: 0x404040,       // 网格线
    BACKGROUND: 0x1a1a1a, // 背景色
    ROOM_BORDER: 0x2f2f2f,
};

const BUILDING_COLORS: Record<BuildingType, number> = {
    spawn: 0xf4d35e,
    tower: 0x70d6ff,
    extension: 0xf4978e,
};

const BUILDING_LABELS: Record<BuildingType, string> = {
    spawn: 'Spawn',
    tower: 'Tower',
    extension: 'Extension',
};

/**
 * TerrainMap 组件
 * 使用 PixiJS 渲染 Screeps 地形数据
 * 使用 React 缓存机制优化性能
 */
export default function TerrainMap({ rooms, buildings }: TerrainMapProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const resetViewRef = useRef<(() => void) | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    // 使用 useMemo 缓存解析后的地形数据
    const parsedRooms = useMemo(() => {
        return rooms.map((room) => {
            const terrainArray: number[][] = [];
            for (let y = 0; y < ROOM_SIZE; y++) {
                terrainArray[y] = [];
                for (let x = 0; x < ROOM_SIZE; x++) {
                    const index = y * ROOM_SIZE + x;
                    terrainArray[y][x] = parseInt(room.terrain[index]) || 0;
                }
            }
            return {
                ...room,
                coords: roomNameToXY(room.roomName),
                terrainArray,
            };
        });
    }, [rooms]);

    const mapBounds = useMemo(() => {
        if (!parsedRooms.length) {
            return {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
            };
        }
        const xs = parsedRooms.map((room) => room.coords.x);
        const ys = parsedRooms.map((room) => room.coords.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }, [parsedRooms]);

    useEffect(() => {
        if (!canvasRef.current || !parsedRooms.length) {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: true });
                appRef.current = null;
            }
            return;
        }

        // 创建 PixiJS 应用
        const app = new PIXI.Application();
        
        (async () => {
            const margin = 40;
            const mapWidth = (mapBounds.maxX - mapBounds.minX + 1) * ROOM_PX + margin * 2;
            const mapHeight = (mapBounds.maxY - mapBounds.minY + 1) * ROOM_PX + margin * 2;

            await app.init({
                width: Math.max(600, mapWidth),
                height: Math.max(600, mapHeight),
                backgroundColor: COLORS.BACKGROUND,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            if (canvasRef.current) {
                canvasRef.current.innerHTML = '';
                canvasRef.current.appendChild(app.canvas);
            }

            appRef.current = app;

            // 创建主容器
            const mainContainer = new PIXI.Container();
            app.stage.addChild(mainContainer);

            // 绘制地形
            const terrainGraphics = new PIXI.Graphics();
            
            parsedRooms.forEach((room) => {
                const offsetX = (room.coords.x - mapBounds.minX) * ROOM_PX + margin;
                const offsetY = (room.coords.y - mapBounds.minY) * ROOM_PX + margin;

                for (let y = 0; y < ROOM_SIZE; y++) {
                    for (let x = 0; x < ROOM_SIZE; x++) {
                        const terrainCode = room.terrainArray[y][x];
                        let color = COLORS.PLAIN;
                        if (terrainCode & TERRAIN_MASK_WALL) {
                            color = COLORS.WALL;
                        } else if (terrainCode & TERRAIN_MASK_SWAMP) {
                            color = COLORS.SWAMP;
                        }

                        terrainGraphics.rect(
                            offsetX + x * TILE_SIZE,
                            offsetY + y * TILE_SIZE,
                            TILE_SIZE,
                            TILE_SIZE
                        );
                        terrainGraphics.fill(color);
                    }
                }
            });

            mainContainer.addChild(terrainGraphics);

            // 绘制网格
            const gridGraphics = new PIXI.Graphics();
            gridGraphics.setStrokeStyle({ width: 0.5, color: COLORS.GRID, alpha: 0.3 });

            parsedRooms.forEach((room) => {
                const offsetX = (room.coords.x - mapBounds.minX) * ROOM_PX + margin;
                const offsetY = (room.coords.y - mapBounds.minY) * ROOM_PX + margin;

                // 横线
                for (let i = 0; i <= ROOM_SIZE; i++) {
                    gridGraphics.moveTo(offsetX, offsetY + i * TILE_SIZE);
                    gridGraphics.lineTo(offsetX + ROOM_PX, offsetY + i * TILE_SIZE);
                    gridGraphics.stroke();
                }

                // 竖线
                for (let i = 0; i <= ROOM_SIZE; i++) {
                    gridGraphics.moveTo(offsetX + i * TILE_SIZE, offsetY);
                    gridGraphics.lineTo(offsetX + i * TILE_SIZE, offsetY + ROOM_PX);
                    gridGraphics.stroke();
                }
            });

            mainContainer.addChild(gridGraphics);

            // 添加房间边框与标签
            const roomBorder = new PIXI.Graphics();
            roomBorder.setStrokeStyle({ width: 2, color: COLORS.ROOM_BORDER, alpha: 0.9 });
            parsedRooms.forEach((room) => {
                const offsetX = (room.coords.x - mapBounds.minX) * ROOM_PX + margin;
                const offsetY = (room.coords.y - mapBounds.minY) * ROOM_PX + margin;
                roomBorder.rect(offsetX, offsetY, ROOM_PX, ROOM_PX);
                roomBorder.stroke();

                const roomText = new PIXI.Text({
                    text: room.roomName,
                    style: {
                        fontFamily: 'Arial',
                        fontSize: 14,
                        fill: 0xffffff,
                        fontWeight: 'bold',
                    },
                });
                roomText.x = offsetX + 6;
                roomText.y = offsetY + 6;
                mainContainer.addChild(roomText);
            });
            mainContainer.addChild(roomBorder);

            // 建筑渲染
            const buildingContainer = new PIXI.Container();
            buildings.forEach((building) => {
                const targetRoom = parsedRooms.find((room) => room.roomName === building.roomName);
                if (!targetRoom) return;
                const offsetX = (targetRoom.coords.x - mapBounds.minX) * ROOM_PX + margin;
                const offsetY = (targetRoom.coords.y - mapBounds.minY) * ROOM_PX + margin;
                const centerX = offsetX + building.x * TILE_SIZE + TILE_SIZE / 2;
                const centerY = offsetY + building.y * TILE_SIZE + TILE_SIZE / 2;

                const graphic = new PIXI.Graphics();
                const color = BUILDING_COLORS[building.type];
                if (building.type === 'tower') {
                    graphic.roundRect(-5, -5, 10, 10, 2);
                } else if (building.type === 'extension') {
                    graphic.rect(-4, -4, 8, 8);
                } else {
                    graphic.circle(0, 0, 5);
                }
                graphic.fill(color);
                graphic.x = centerX;
                graphic.y = centerY;
                graphic.eventMode = 'static';
                graphic.cursor = 'pointer';
                graphic.on('pointertap', (event) => {
                    event.stopPropagation();
                    setSelectedBuilding(building);
                    const wrapperRect = wrapperRef.current?.getBoundingClientRect();
                    const canvasRect = app.canvas.getBoundingClientRect();
                    if (wrapperRect) {
                        setTooltipPosition({
                            x: event.global.x + canvasRect.left - wrapperRect.left,
                            y: event.global.y + canvasRect.top - wrapperRect.top,
                        });
                    }
                });
                buildingContainer.addChild(graphic);
            });
            mainContainer.addChild(buildingContainer);

            // 添加图例
            const legendContainer = new PIXI.Container();
            legendContainer.x = 10;
            legendContainer.y = Math.max(10, app.screen.height - 30);

            const legendItems = [
                { color: COLORS.PLAIN, label: '平原' },
                { color: COLORS.WALL, label: '墙壁' },
                { color: COLORS.SWAMP, label: '沼泽' },
            ];

            legendItems.forEach((item, index) => {
                const box = new PIXI.Graphics();
                box.rect(0, 0, 15, 15);
                box.fill(item.color);
                box.x = index * 80;
                
                const text = new PIXI.Text({
                    text: item.label,
                    style: {
                        fontFamily: 'Arial',
                        fontSize: 12,
                        fill: 0xffffff,
                    }
                });
                text.x = index * 80 + 20;
                text.y = 0;
                
                legendContainer.addChild(box);
                legendContainer.addChild(text);
            });

            app.stage.addChild(legendContainer);

            // 交互功能：缩放和平移
            let isDragging = false;
            let dragStart = { x: 0, y: 0 };

            app.canvas.style.cursor = 'grab';
            app.stage.eventMode = 'static';
            app.stage.hitArea = app.screen;
            app.stage.on('pointertap', () => {
                setSelectedBuilding(null);
            });

            app.canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStart = { x: e.clientX - mainContainer.x, y: e.clientY - mainContainer.y };
                app.canvas.style.cursor = 'grabbing';
                setSelectedBuilding(null);
            });

            app.canvas.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    mainContainer.x = e.clientX - dragStart.x;
                    mainContainer.y = e.clientY - dragStart.y;
                    setPosition({ x: mainContainer.x, y: mainContainer.y });
                }
            });

            app.canvas.addEventListener('mouseup', () => {
                isDragging = false;
                app.canvas.style.cursor = 'grab';
            });

            app.canvas.addEventListener('mouseleave', () => {
                isDragging = false;
                app.canvas.style.cursor = 'grab';
            });

            // 缩放功能
            app.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                const newScale = mainContainer.scale.x * delta;
                
                if (newScale >= 0.5 && newScale <= 3) {
                    mainContainer.scale.x = newScale;
                    mainContainer.scale.y = newScale;
                    setScale(newScale);
                    setSelectedBuilding(null);
                }
            });

            // 重置按钮功能
            const resetView = () => {
                mainContainer.x = 0;
                mainContainer.y = 0;
                mainContainer.scale.x = 1;
                mainContainer.scale.y = 1;
                setPosition({ x: 0, y: 0 });
                setScale(1);
                setSelectedBuilding(null);
            };

            // 将重置功能暴露给外部
            resetViewRef.current = resetView;
        })();

        // 清理函数
        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: true });
                appRef.current = null;
            }
        };
    }, [buildings, mapBounds, parsedRooms]);

    const handleReset = () => {
        resetViewRef.current?.();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                    <span className="mr-4">缩放: {(scale * 100).toFixed(0)}%</span>
                    <span>位置: ({position.x.toFixed(0)}, {position.y.toFixed(0)})</span>
                </div>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
                >
                    重置视图
                </button>
            </div>
            
            <div className="relative">
                <div 
                    ref={wrapperRef}
                    className="flex justify-center items-center bg-gray-900 rounded-lg overflow-hidden border border-gray-700"
                    style={{ minHeight: '600px' }}
                >
                    <div ref={canvasRef} />
                </div>
                {selectedBuilding && (
                    <div
                        className="absolute z-10 min-w-[180px] rounded-lg border border-blue-500/50 bg-gray-900/95 p-3 text-xs text-gray-200 shadow-lg backdrop-blur"
                        style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
                    >
                        <div className="mb-1 text-sm font-semibold text-white">
                            {BUILDING_LABELS[selectedBuilding.type]}
                        </div>
                        <div className="text-gray-400">房间: {selectedBuilding.roomName}</div>
                        <div className="text-gray-400">坐标: ({selectedBuilding.x}, {selectedBuilding.y})</div>
                        {selectedBuilding.hp !== undefined && (
                            <div className="text-gray-400">耐久: {selectedBuilding.hp}</div>
                        )}
                        <button
                            onClick={() => setSelectedBuilding(null)}
                            className="mt-2 text-blue-300 hover:text-blue-200"
                        >
                            关闭
                        </button>
                    </div>
                )}
            </div>
            
            <div className="text-xs text-gray-500 text-center">
                💡 提示: 使用鼠标拖拽移动地图，滚轮缩放
            </div>
        </div>
    );
}
