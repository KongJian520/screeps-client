'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as PIXI from 'pixi.js';

interface TerrainMapProps {
    terrain: string;
    roomName: string;
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
};

/**
 * TerrainMap 组件
 * 使用 PixiJS 渲染 Screeps 地形数据
 * 使用 React 缓存机制优化性能
 */
export default function TerrainMap({ terrain, roomName }: TerrainMapProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // 使用 useMemo 缓存解析后的地形数据
    const parsedTerrain = useMemo(() => {
        console.log('解析地形数据...');
        const terrainArray: number[][] = [];
        for (let y = 0; y < 50; y++) {
            terrainArray[y] = [];
            for (let x = 0; x < 50; x++) {
                const index = y * 50 + x;
                terrainArray[y][x] = parseInt(terrain[index]) || 0;
            }
        }
        return terrainArray;
    }, [terrain]);

    useEffect(() => {
        if (!canvasRef.current) return;

        // 创建 PixiJS 应用
        const app = new PIXI.Application();
        
        (async () => {
            await app.init({
                width: 600,
                height: 600,
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

            // 地图大小
            const ROOM_SIZE = 50;
            const TILE_SIZE = 10;

            // 绘制地形
            const terrainGraphics = new PIXI.Graphics();
            
            for (let y = 0; y < ROOM_SIZE; y++) {
                for (let x = 0; x < ROOM_SIZE; x++) {
                    const terrainCode = parsedTerrain[y][x];
                    
                    let color = COLORS.PLAIN;
                    if (terrainCode & TERRAIN_MASK_WALL) {
                        color = COLORS.WALL;
                    } else if (terrainCode & TERRAIN_MASK_SWAMP) {
                        color = COLORS.SWAMP;
                    }

                    terrainGraphics.rect(
                        x * TILE_SIZE + 50,
                        y * TILE_SIZE + 50,
                        TILE_SIZE,
                        TILE_SIZE
                    );
                    terrainGraphics.fill(color);
                }
            }

            mainContainer.addChild(terrainGraphics);

            // 绘制网格
            const gridGraphics = new PIXI.Graphics();
            gridGraphics.setStrokeStyle({ width: 0.5, color: COLORS.GRID, alpha: 0.3 });

            // 横线
            for (let i = 0; i <= ROOM_SIZE; i++) {
                gridGraphics.moveTo(50, i * TILE_SIZE + 50);
                gridGraphics.lineTo(ROOM_SIZE * TILE_SIZE + 50, i * TILE_SIZE + 50);
                gridGraphics.stroke();
            }

            // 竖线
            for (let i = 0; i <= ROOM_SIZE; i++) {
                gridGraphics.moveTo(i * TILE_SIZE + 50, 50);
                gridGraphics.lineTo(i * TILE_SIZE + 50, ROOM_SIZE * TILE_SIZE + 50);
                gridGraphics.stroke();
            }

            mainContainer.addChild(gridGraphics);

            // 添加房间名称标签
            const roomText = new PIXI.Text({
                text: roomName,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 16,
                    fill: 0xffffff,
                    fontWeight: 'bold',
                }
            });
            roomText.x = 10;
            roomText.y = 10;
            app.stage.addChild(roomText);

            // 添加图例
            const legendContainer = new PIXI.Container();
            legendContainer.x = 10;
            legendContainer.y = ROOM_SIZE * TILE_SIZE + 70;

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

            app.canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStart = { x: e.clientX - mainContainer.x, y: e.clientY - mainContainer.y };
                app.canvas.style.cursor = 'grabbing';
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
            };

            // 将重置功能暴露给外部
            (app as any).resetView = resetView;
        })();

        // 清理函数
        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: true });
                appRef.current = null;
            }
        };
    }, [parsedTerrain, roomName]);

    const handleReset = () => {
        if (appRef.current && (appRef.current as any).resetView) {
            (appRef.current as any).resetView();
        }
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
            
            <div 
                ref={canvasRef} 
                className="flex justify-center items-center bg-gray-900 rounded-lg overflow-hidden"
                style={{ minHeight: '600px' }}
            />
            
            <div className="text-xs text-gray-500 text-center">
                💡 提示: 使用鼠标拖拽移动地图，滚轮缩放
            </div>
        </div>
    );
}
