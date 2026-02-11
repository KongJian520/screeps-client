import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import 'server-only'; // 如果客户端不小心导入了此文件，编译时会报错提示
import { ScreepsShard } from './constants';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'screeps.db');
const db = new Database(dbPath);

// ----------------------------------------------------------------
// 2. 初始化所有 Shard 的表
// 注释：使用枚举的 values 循环创建表，减少冗余代码
// ----------------------------------------------------------------
Object.values(ScreepsShard).forEach((shard) => {
    // 转换成首字母大写的表名，如 GameMap_Shard0
    const tableName = `GameMap_${shard.charAt(0).toUpperCase() + shard.slice(1)}`;
    db.exec(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      roomName TEXT PRIMARY KEY,
      terrain TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);
});

/**
 * 核心工具函数：根据枚举获取对应的表名
 */
const getTableName = (shard: ScreepsShard) => {
    return `GameMap_${shard.charAt(0).toUpperCase() + shard.slice(1)}`;
};

// ----------------------------------------------------------------
// 3. 封装数据库操作逻辑
// ----------------------------------------------------------------
export const terrainDb = {
    /**
     * 保存地形数据
     */
    saveTerrain: (shard: ScreepsShard, roomName: string, terrain: string) => {
        const table = getTableName(shard);
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO ${table} (roomName, terrain, updatedAt)
      VALUES (?, ?, ?)
    `);
        return stmt.run(roomName, terrain, Date.now());
    },

    /**
     * 获取地形数据
     */
    getTerrain: (shard: ScreepsShard, roomName: string) => {
        const table = getTableName(shard);
        const stmt = db.prepare(`SELECT terrain FROM ${table} WHERE roomName = ?`);
        return stmt.get(roomName) as { terrain: string } | undefined;
    }
};

export default db;