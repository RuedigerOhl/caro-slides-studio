"""Plan the new deck using Claude.

Input: extracted slides (JSON), optional additional_content, optional instructions.
Output: list of slide specs ready for design.render_slide().
"""
from __future__ import annotations
import json
import os
from pathlib import Path
from anthropic import Anthropic


MODEL = 'claude-opus-4-7'

SYSTEM_PROMPT = """Du bist der Slide-Architekt für Caros Slide Studio.

Du baust Coaching-Präsentationen für Carolin Martin (Karrierecoach München) im neuen Master-Design.

ZIEL: Eine bestehende, durcheinander gewachsene PPTX in ein klares, modernes Deck im Master-Stil überführen — Inhalte zu 90-95% beibehalten, Aussage NIE verfälschen. Schaubilder, Bilder und Texte werden re-arrangiert in saubere Layouts.

VERFÜGBARE LAYOUTS:
- "cover": Titel-Slide. Felder: title, subtitle, presenter, sub_lines (Liste), date.
- "section": Kapitel-Trenner. Felder: number ("01"/"02"…), title, subtitle.
- "bullets": Headline + Bullet-Liste. Felder: title, bullets (Liste, max 6 prägnant).
- "paragraph": Headline + ein oder mehrere Fließtext-Absätze. Felder: title, paragraphs (Liste).
- "two_column": Vergleichs-Slide. Felder: title, left_title, left_body (string ODER bullets-Liste), right_title, right_body.
- "quote": Großes Zitat. Felder: quote, attribution.
- "image_left": Bild links, Text rechts. Felder: title, image_ref (Verweis auf source image), text_title, text_body.
- "image_right": Bild rechts, Text links. Felder: title, image_ref, text_title, text_body.
- "image_center": Großes zentriertes Bild. Felder: title, image_ref, caption.
- "closing": Abschluss. Felder: message (z.B. "Danke."), lines (Liste mit Kontaktdaten).

REGELN:
1. Inhalte BEHALTEN — nicht erfinden, nicht weglassen. Wenn der User Anweisungen gibt ("kürzen", "neu schreiben"), darfst du dort frei sein.
2. Lange Texte sinnvoll splitten — wenn ein Original-Slide 15 Bullets hat, mach 2-3 Slides daraus mit je 5-6 Bullets. Lieber mehr Slides als überfüllte.
3. Layout passend wählen — Vergleiche → two_column. Zitate → quote. Hauptaussagen → bullets. Erklärungen → paragraph. Slides mit großem zentralem Bild → image_center.
4. Bilder: wenn ein source-Slide ein Bild hat (siehe images[] mit name oder path), übernimm es. Verwende image_ref = Name oder Pfad des Originalbildes aus der Eingabe.
5. Erster Slide ist IMMER "cover". Letzter Slide ist IMMER "closing".
6. Bei Kapitel-Trennern: nummerier durch (01, 02, 03...).
7. Wenn der User additional_content liefert: integriere sinnvoll an passender Stelle (am Ende oder thematisch eingeordnet).
8. Wenn der User Anweisungen gibt: respektiere sie ABSOLUT.

OUTPUT: JSON-Objekt mit Feld "slides" = Liste von Slide-Specs. Sonst NICHTS. Kein Erklärtext, kein Markdown.
"""


PLAN_TOOL = {
    'name': 'submit_deck_plan',
    'description': 'Submit the planned deck as a list of slide specifications.',
    'input_schema': {
        'type': 'object',
        'properties': {
            'slides': {
                'type': 'array',
                'description': 'Ordered list of slides for the new deck.',
                'items': {
                    'type': 'object',
                    'properties': {
                        'layout': {
                            'type': 'string',
                            'enum': ['cover', 'section', 'bullets', 'paragraph',
                                     'two_column', 'quote', 'image_left', 'image_right',
                                     'image_center', 'closing'],
                        },
                        'title': {'type': 'string'},
                        'subtitle': {'type': 'string'},
                        'presenter': {'type': 'string'},
                        'sub_lines': {'type': 'array', 'items': {'type': 'string'}},
                        'date': {'type': 'string'},
                        'number': {'type': 'string'},
                        'bullets': {'type': 'array', 'items': {'type': 'string'}},
                        'paragraphs': {'type': 'array', 'items': {'type': 'string'}},
                        'left_title': {'type': 'string'},
                        'left_body': {'type': 'string'},
                        'right_title': {'type': 'string'},
                        'right_body': {'type': 'string'},
                        'quote': {'type': 'string'},
                        'attribution': {'type': 'string'},
                        'image_ref': {'type': 'string', 'description': 'Filename or path of source image to embed.'},
                        'text_title': {'type': 'string'},
                        'text_body': {'type': 'string'},
                        'caption': {'type': 'string'},
                        'message': {'type': 'string'},
                        'lines': {'type': 'array', 'items': {'type': 'string'}},
                    },
                    'required': ['layout'],
                },
            },
        },
        'required': ['slides'],
    },
}


def plan_deck(source_slides: list,
              additional_content: str = '',
              instructions: str = '',
              presenter: str = 'Carolin Martin',
              date: str = '',
              debug_dir: str = '') -> dict:
    client = Anthropic()
    # Drop image binaries to keep tokens reasonable — only metadata is sent
    lean_slides = []
    for s in source_slides:
        lean_slides.append({
            'index': s.get('index'),
            'title': s.get('title', ''),
            'paragraphs': s.get('paragraphs', []),
            'bullets': s.get('bullets', []),
            'images': [{'name': i.get('name'),
                        'path': Path(i['path']).name if i.get('path') else None,
                        'width': i.get('width'),
                        'height': i.get('height')}
                       for i in s.get('images', [])],
            'raw_layout_name': s.get('raw_layout_name', ''),
        })
    user_msg = json.dumps({
        'source_slides': lean_slides,
        'additional_content': additional_content,
        'instructions': instructions,
        'presenter': presenter,
        'date': date,
    }, ensure_ascii=False)

    with client.messages.stream(
        model=MODEL,
        max_tokens=32000,
        system=SYSTEM_PROMPT,
        tools=[PLAN_TOOL],
        tool_choice={'type': 'tool', 'name': 'submit_deck_plan'},
        messages=[{'role': 'user', 'content': user_msg}],
    ) as stream:
        final = stream.get_final_message()

    if debug_dir:
        Path(debug_dir).mkdir(parents=True, exist_ok=True)
        (Path(debug_dir) / 'raw_response.json').write_text(
            json.dumps([b.model_dump() for b in final.content], indent=2, ensure_ascii=False))

    for block in final.content:
        if block.type == 'tool_use' and block.name == 'submit_deck_plan':
            return block.input
    raise ValueError(f'Claude did not call the tool. stop_reason={final.stop_reason}')


if __name__ == '__main__':
    import sys
    src_json = json.loads(Path(sys.argv[1]).read_text())
    plan = plan_deck(src_json,
                     additional_content=sys.argv[2] if len(sys.argv) > 2 else '',
                     instructions=sys.argv[3] if len(sys.argv) > 3 else '')
    print(json.dumps(plan, indent=2, ensure_ascii=False))
