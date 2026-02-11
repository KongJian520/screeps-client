'use client';

import { useState } from 'react';
import { getTerrainAction } from './actions';
import { ScreepsShard } from '@/lib/constants';


export default function TerrainPage() {
    const [room, setRoom] = useState(String);
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

    return (
        <>
            <h1>Hello</h1>
        </>
    );
}