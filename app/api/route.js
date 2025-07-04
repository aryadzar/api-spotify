// app/api/spotify/route.js
import { NextResponse } from 'next/server';

const {
  SPOTIFY_CLIENT_ID: client_id,
  SPOTIFY_CLIENT_SECRET: client_secret,
  SPOTIFY_REFRESH_TOKEN: refresh_token,
} = process.env;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const allowedOrigins = [
  'http://localhost:5173',
  'https://www.aryadzar.my.id',
  "http://localhost:3000"
]
async function getAccessToken() {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }),
  });

  if (!response.ok) {
    console.error('Failed to refresh token');
    return null;
  }

  return response.json();
}

async function getNowPlaying(access_token) {
  return await fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
}

export async function GET(request) {
  const origin = request.headers.get("origin") || ""

  const token = await getAccessToken();
  if (!token?.access_token) {
    return NextResponse.json({ isPlaying: false }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
        "Content-Type": "application/json",
      },
    });
  }

  const response = await getNowPlaying(token.access_token);

  if (response.status === 204 || response.status > 400) {
    return NextResponse.json({ isPlaying: false }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
        "Content-Type": "application/json",
      },
    });
  }

  const song = await response.json();

  if (song?.currently_playing_type !== 'track') {
    return NextResponse.json({ isPlaying: false }, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
        "Content-Type": "application/json",
      },
    });
  }

  const data = {
    isPlaying: song.is_playing,
    title: song.item.name,
    album: song.item.album.name,
    artist: song.item.album.artists.map((a) => a.name).join(', '),
    albumImageUrl: song.item.album.images[0].url,
    songUrl: song.item.external_urls.spotify,
  };

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
      "Content-Type": "application/json",
    },
  });
}

export async function OPTIONS(request) {
  const origin = request.headers.get("origin") || ""

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}