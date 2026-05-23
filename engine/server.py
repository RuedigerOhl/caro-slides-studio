"""Stateless FastAPI wrapper for the transformation engine.

POST /transform
  multipart/form-data:
    file: source PPTX
    additional_content: str (optional)
    instructions: str (optional)
    presenter: str (default "Carolin Martin")
    date: str (optional, "DD.MM.YYYY")
  → returns transformed PPTX as binary

GET /health → {"status": "ok"}

Run: uvicorn engine.server:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from engine.transform import transform

app = FastAPI(title='Caros Slide Studio Engine')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'caro-slides-engine'}


@app.post('/transform')
async def transform_endpoint(
    file: UploadFile = File(...),
    additional_content: str = Form(''),
    instructions: str = Form(''),
    presenter: str = Form('Carolin Martin'),
    date: str = Form(''),
):
    if not file.filename or not file.filename.lower().endswith('.pptx'):
        raise HTTPException(400, 'Only .pptx files are supported')
    if not os.environ.get('ANTHROPIC_API_KEY'):
        raise HTTPException(500, 'ANTHROPIC_API_KEY not configured on server')

    work = Path(tempfile.mkdtemp(prefix='caroengine_'))
    src = work / 'source.pptx'
    out = work / 'output.pptx'
    src.write_bytes(await file.read())

    try:
        result = transform(str(src), str(out),
                           additional_content=additional_content,
                           instructions=instructions,
                           presenter=presenter, date=date)
    except Exception as e:
        raise HTTPException(500, f'Transformation failed: {e}')

    download_name = (file.filename or 'output').replace('.pptx', '_caro.pptx')
    return FileResponse(
        out,
        media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation',
        filename=download_name,
        headers={'X-Source-Slides': str(result['source_slides']),
                 'X-Output-Slides': str(result['output_slides'])},
    )
