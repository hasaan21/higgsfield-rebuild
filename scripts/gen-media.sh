#!/usr/bin/env bash
# Renders the synthetic mock "generation outputs" in public/media with ffmpeg lavfi sources.
# No third-party footage: everything is procedurally generated, so it can ship publicly.
set -euo pipefail

OUT="public/media"
FPS=24
DUR=5
mkdir -p "$OUT"

render() {
  local name=$1 w=$2 h=$3 src=$4 grade=$5
  echo "rendering $name (${w}x${h})"
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i "$src" -t "$DUR" \
    -vf "${grade},scale=w='trunc(${w}*(1+0.08*t/${DUR})/2)*2':h=-2:eval=frame,crop=${w}:${h},vignette=PI/4.5,noise=alls=6:allf=t,format=yuv420p" \
    -r "$FPS" -c:v libx264 -preset slow -crf 27 -movflags +faststart -an "$OUT/$name.mp4"
  ffmpeg -y -hide_banner -loglevel error -ss 2.5 -i "$OUT/$name.mp4" -frames:v 1 -q:v 3 "$OUT/$name.jpg"
}

# Demoscene-style plasma rendered at quarter resolution, upscaled and blurred into soft light/fog.
# Args: width height fx fy fd fr speed
plasma() {
  local w=$(( $1 / 4 )) h=$(( $2 / 4 ))
  echo "nullsrc=s=${w}x${h}:r=${FPS},geq=lum='128+31*(sin(X/$3+T*0.6*$7)+sin(Y/$4-T*0.45*$7)+sin((X+Y)/$5+T*0.3*$7)+sin(hypot(X-W/2\,Y-H/2)/$6-T*0.8*$7))':cb=128:cr=128,scale=$1:$2:flags=bicubic,gblur=sigma=6"
}

render dune 1280 720 "$(plasma 1280 720 31 13 41 23 0.8)" \
  "format=rgb24,lutrgb=r='min(255,20+val*1.0)':g='8+val*0.58':b='14+val*0.3',eq=contrast=1.25"

render tide 1344 576 "$(plasma 1344 576 19 29 37 27 1.2)" \
  "format=rgb24,lutrgb=r='4+val*0.25':g='18+val*0.62':b='36+val*0.95',eq=contrast=1.3"

render aurora 720 1280 "gradients=s=720x1280:r=${FPS}:n=5:c0=0x0b1026:c1=0x1de9b6:c2=0x6a00f4:c3=0x00b4d8:c4=0x0b1026:speed=0.02:seed=11" \
  "gblur=sigma=24,eq=contrast=1.1:saturation=1.3"

render nebula 1280 720 "mandelbrot=s=1280x720:r=${FPS}:start_scale=2.5:end_scale=0.6:end_pts=240:maxiter=180:outer=normalized_iteration_count" \
  "format=gray,eq=contrast=1.3,format=rgb24,lutrgb=r='8+val*0.55':g='6+val*0.35':b='24+val*0.95',gblur=sigma=1"

render cells 960 960 "life=s=240x240:r=${FPS}:mold=0:ratio=0.18:seed=42:death_color=#08000f:life_color=#00ffd0" \
  "scale=960:960:flags=bicubic,gblur=sigma=2.5,lagfun=decay=0.9"

render embers 720 1280 "$(plasma 720 1280 7 9 11 6 1.6)" \
  "format=rgb24,lutrgb=r='if(gt(val,150),min(255,(val-150)*2.4),0)':g='if(gt(val,175),(val-175)*1.8,0)':b='if(gt(val,215),(val-215)*1.5,0)'"

render storm 1280 720 "$(plasma 1280 720 43 21 33 51 0.6)" \
  "format=rgb24,lutrgb=r='10+val*0.55':g='14+val*0.6':b='22+val*0.72',eq=contrast=1.35:brightness='0.1*gt(mod(t\,2.3)\,2.12)':eval=frame"

render prism 960 960 "gradients=s=960x960:r=${FPS}:n=4:c0=0xff4d6d:c1=0xffb347:c2=0x7b2cbf:c3=0x2b2d42:speed=0.03:seed=5" \
  "gblur=sigma=30,eq=saturation=1.2"

render noir 1344 576 "$(plasma 1344 576 17 47 23 31 0.5)" \
  "format=gray,eq=contrast=1.7:brightness=-0.04,format=rgb24"

render lagoon 864 1080 "$(plasma 864 1080 27 19 15 35 0.9)" \
  "format=rgb24,lutrgb=r='6+val*0.3':g='30+val*0.8':b='26+val*0.62',eq=contrast=1.2:saturation=1.3"

du -sh "$OUT"
