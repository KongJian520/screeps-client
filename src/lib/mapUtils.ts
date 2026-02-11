export function roomNameToXY(name: string) {
    // 【添加这一行】确保 name 存在且是字符串
    if (!name || typeof name !== 'string') {
        return { x: 0, y: 0 };
    }

    const match = name.match(/^([WE])(\d+)([NS])(\d+)$/i);
    if (!match) return { x: 0, y: 0 };

    const [_, hDir, hPos, vDir, vPos] = match;
    let x = parseInt(hPos);
    let y = parseInt(vPos);
    if (hDir.toUpperCase() === 'W') x = -x - 1;
    if (vDir.toUpperCase() === 'N') y = -y - 1;
    return { x, y };
}
// 将坐标转回房间名
export function xyToRoomName(x: number, y: number) {
    const hDir = x >= 0 ? 'E' : 'W';
    const hPos = x >= 0 ? x : -x - 1;
    const vDir = y >= 0 ? 'S' : 'N';
    const vPos = y >= 0 ? y : -y - 1;
    return `${hDir}${hPos}${vDir}${vPos}`;
}

export const ROOM_SIZE = 50;
export const TILE_SIZE = 10;
export const ROOM_PX = ROOM_SIZE * TILE_SIZE; // 500px