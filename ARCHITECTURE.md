# Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Screeps Client Architecture                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                    │
├─────────────────────────────────────────────────────────────────┤
│  src/app/page.tsx                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - UI Components (React 19)                               │  │
│  │  - State Management (useState)                            │  │
│  │  - User Interactions                                      │  │
│  │  - Input: room name, shard selection                      │  │
│  │  - Display: terrain data, loading states                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ↓                                    │
│  src/components/TerrainMap.tsx                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - Terrain Visualization (EMPTY - Not Implemented)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Server Actions Call]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER ACTIONS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  src/app/actions.ts                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  'use server'                                             │  │
│  │  - getTerrainAction(roomName, shard)                      │  │
│  │  - Error handling wrapper                                 │  │
│  │  - Returns: { success, data?, error? }                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  src/services/terrain.ts                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - fetchRoomTerrain(room, shard)                          │  │
│  │  - Token authentication (SCREEPS_TOKEN)                   │  │
│  │  - Cache check → API call → Cache save                    │  │
│  │  - API: https://screeps.com/api/game/room-terrain         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ↓                                    │
│  src/lib/mapUtils.ts                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - roomNameToXY(name)                                     │  │
│  │  - xyToRoomName(x, y)                                     │  │
│  │  - Room coordinate conversion utilities                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/db.ts                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLite Database (better-sqlite3)                         │  │
│  │  - Tables: GameMap_Shard0/1/2/3                           │  │
│  │  - terrainDb.saveTerrain(shard, room, data)               │  │
│  │  - terrainDb.getTerrain(shard, room)                      │  │
│  │  - Location: ./data/screeps.db                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             ↓                                    │
│  src/lib/constants.ts                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  enum ScreepsShard {                                      │  │
│  │    Shard0 = 'shard0',                                     │  │
│  │    Shard1 = 'shard1',                                     │  │
│  │    Shard2 = 'shard2',                                     │  │
│  │    Shard3 = 'shard3'                                      │  │
│  │  }                                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       EXTERNAL API                               │
├─────────────────────────────────────────────────────────────────┤
│  Screeps Official API                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  GET /api/game/room-terrain                               │  │
│  │  Query: ?room=W0N0&shard=shard3&encoded=1                 │  │
│  │  Header: X-Token: <SCREEPS_TOKEN>                         │  │
│  │  Response: { terrain: [{terrain: "..."}], ok: 1 }        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘


DATA FLOW:
==========

1. User enters room name (e.g., "W0N0") and selects shard → page.tsx
2. User clicks "Fetch" button → calls getTerrainAction()
3. Server Action validates and forwards → fetchRoomTerrain()
4. Service checks SQLite cache → terrainDb.getTerrain()
   - Cache HIT: Return cached data immediately ✓
   - Cache MISS: Continue to step 5
5. Service calls Screeps API with authentication
6. API returns terrain data (encoded string)
7. Service saves to SQLite cache → terrainDb.saveTerrain()
8. Data flows back through layers to UI
9. UI displays terrain (when TerrainMap is implemented)


CACHING STRATEGY:
=================

┌────────────────┐
│  User Request  │
└────────┬───────┘
         │
    ┌────▼─────┐
    │  Cache?  │
    └────┬─────┘
         │
    ┌────▼────┬──────────────┐
    │   Yes   │      No      │
    │         │              │
┌───▼──┐  ┌───▼─────────┐   │
│Return│  │ Fetch from  │   │
│Cache │  │ Screeps API │   │
└──────┘  └───┬─────────┘   │
              │             │
         ┌────▼────────┐    │
         │ Save Cache  │    │
         └────┬────────┘    │
              │             │
         ┌────▼────────┐    │
         │Return Data  │◄───┘
         └─────────────┘


SECURITY MODEL:
===============

┌─────────────────────────────────────┐
│  Environment Variables              │
│  ┌────────────────────────────────┐ │
│  │  SCREEPS_TOKEN (server only)   │ │
│  │  Never exposed to client       │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Server Actions ('use server')      │
│  - Only accessible from server      │
│  - Token attached to API requests   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Screeps API                        │
│  - Header: X-Token authentication   │
│  - SSL/TLS encrypted                │
└─────────────────────────────────────┘


CONFIGURATION:
==============

next.config.ts
├── React Compiler enabled (automatic optimization)
└── Experimental features: reactCompiler

tsconfig.json  
├── Strict mode enabled
├── Path alias: @/* → ./src/*
└── Target: ES2017

package.json
├── Scripts: dev, build, start, lint
├── Framework: Next.js 16.1.6
├── React: 19.2.3
└── Database: better-sqlite3 12.6.2


FILE STRUCTURE:
===============

screeps-client/
├── src/
│   ├── app/
│   │   ├── page.tsx          [Client UI - INCOMPLETE]
│   │   ├── actions.ts        [Server Actions]
│   │   └── layout.tsx        [Root Layout]
│   ├── components/
│   │   └── TerrainMap.tsx    [Visualization - EMPTY]
│   ├── services/
│   │   └── terrain.ts        [API Service]
│   └── lib/
│       ├── db.ts             [SQLite Database]
│       ├── constants.ts      [Shard Enum]
│       ├── mapUtils.ts       [Utilities]
│       └── types.ts          [Type Definitions]
├── data/
│   └── screeps.db           [SQLite Database File]
├── .env.example             [Environment Template]
├── .env                     [Environment Config - gitignored]
└── CODE_ANALYSIS.md         [This Analysis]
