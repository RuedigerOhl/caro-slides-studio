"""End-to-end deck transformation.

Usage:
  python -m engine.transform <source.pptx> <output.pptx> \
    [--additional "extra text"] [--instructions "..."] \
    [--presenter "Name"] [--date "DD.MM.YYYY"]

Pipeline:
  1. Extract slides + images from source PPTX → JSON
  2. Plan with Claude → list of slide specs
  3. Render via design module → output PPTX
"""
from __future__ import annotations
import argparse
import json
import sys
import tempfile
from pathlib import Path

from engine.extractor import extract_deck
from engine.planner import plan_deck
from engine import design


def resolve_image(image_ref: str, image_dir: Path) -> str | None:
    if not image_ref:
        return None
    p = Path(image_ref)
    if p.is_absolute() and p.exists():
        return str(p)
    candidate = image_dir / p.name
    if candidate.exists():
        return str(candidate)
    return None


def transform(source_pptx: str, output_pptx: str, *,
              additional_content: str = '',
              instructions: str = '',
              presenter: str = 'Carolin Martin',
              date: str = '') -> dict:
    src = Path(source_pptx)
    out = Path(output_pptx)
    # Use a stable work dir next to output for easier debugging
    work = out.parent / f'.work_{out.stem}'
    work.mkdir(parents=True, exist_ok=True)
    img_dir = work / 'images'
    img_dir.mkdir(parents=True, exist_ok=True)

    print(f'[1/3] extracting {src.name} …', file=sys.stderr)
    source_slides = extract_deck(str(src), str(img_dir))
    (work / 'source.json').write_text(json.dumps(source_slides, indent=2, ensure_ascii=False))
    print(f'      → {len(source_slides)} slides extracted, '
          f'{sum(len(s["images"]) for s in source_slides)} images', file=sys.stderr)

    print('[2/3] planning new deck with Claude …', file=sys.stderr)
    plan = plan_deck(source_slides,
                     additional_content=additional_content,
                     instructions=instructions,
                     presenter=presenter, date=date,
                     debug_dir=str(work))
    (work / 'plan.json').write_text(json.dumps(plan, indent=2, ensure_ascii=False))
    slides = plan.get('slides', [])
    print(f'      → {len(slides)} new slides planned', file=sys.stderr)

    print(f'[3/3] rendering → {out.name} …', file=sys.stderr)
    prs = design.new_presentation()
    page_counter = 0
    for spec in slides:
        if 'image_ref' in spec:
            spec['image_path'] = resolve_image(spec.get('image_ref', ''), img_dir)
        if spec.get('layout') not in ('cover',):
            page_counter += 1
            spec['page'] = page_counter
        design.render_slide(prs, spec)

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f'      ✓ written ({out.stat().st_size // 1024} KB)', file=sys.stderr)
    return {
        'source_slides': len(source_slides),
        'output_slides': len(slides),
        'output_path': str(out),
        'work_dir': str(work),
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument('source')
    p.add_argument('output')
    p.add_argument('--additional', default='')
    p.add_argument('--instructions', default='')
    p.add_argument('--presenter', default='Carolin Martin')
    p.add_argument('--date', default='')
    args = p.parse_args()
    result = transform(args.source, args.output,
                       additional_content=args.additional,
                       instructions=args.instructions,
                       presenter=args.presenter, date=args.date)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
