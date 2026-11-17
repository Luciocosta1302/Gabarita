# Prompts de imagem — cenários do Espaço de estudos

Hoje os 4 cenários do `/espaco` são desenhos simples em SVG. Estes prompts geram ilustrações para trocar por eles.
São **8 imagens**: 4 cenários × (dia e noite). Amanhecer e entardecer saem do dia/noite com um filtro de cor no app.

**Formato:** 16:9, 1920×1080 (ou maior), PNG/WEBP. Nomes: `quarto-dia`, `quarto-noite`, `kyoto-dia`, `kyoto-noite`,
`toquio-dia`, `toquio-noite`, `cafe-dia`, `cafe-noite`. Eles vão para `public/cenarios/`.

## Estilo (cole no começo de todos)

> Cozy lo-fi Japanese study room illustration, flat 2D with clean dark ink outlines (#1f1a17), hand-drawn feel,
> soft grain/washi paper texture, limited palette: washi cream #f4efe4, indigo #22334b, vermilion seal red #c8372d,
> matcha green #5d8a3a, muted gold #c79a3a, warm wood browns. Calm, quiet, no people, no animals, no text,
> no logos, no watermark. Wide 16:9 composition, a window is the focal point, the lower-right corner is a clear
> empty floor/desk area (a small cat character will be added there later). Subtle seigaiha wave pattern on one
> fabric or wall detail. Not photorealistic, not 3D, not anime screenshot.

## 1. Quarto aconchegante (`quarto`)
- **Dia:** `[estilo] A small Japanese bedroom study corner at daytime: low wooden desk under a big window, Mount Fuji
  far away in pale blue sky, a stack of notebooks, a potted plant, a steaming cup of green tea, a desk lamp turned
  off, futon with indigo seigaiha cover in the background, warm sunlight patches on tatami floor.`
- **Noite:** `[mesmo texto] … at night: deep indigo sky with a few stars and a crescent moon behind Fuji, the warm
  desk lamp is on and makes a cozy circle of light, window slightly reflects the room.`

## 2. Biblioteca em Kyoto (`kyoto`)
- **Dia:** `[estilo] A quiet traditional library in Kyoto: tall dark wooden bookshelves, a long reading table,
  shoji paper sliding doors half open to a small garden with a red maple tree and stone lantern, soft daylight
  through the paper screens, a red paper lantern hanging, open books on the table.`
- **Noite:** `[mesmo texto] … at night: garden lit by the stone lantern, paper lantern glowing red-orange,
  warm reading lamps on the table, deep blue shadows between the shelves.`

## 3. Quarto chuvoso em Tóquio (`toquio`)
- **Dia:** `[estilo] A small apartment desk in Tokyo on a rainy afternoon: big window with raindrops and streaks,
  grey-blue city rooftops and a distant tower in the rain, a transparent umbrella leaning by the window, desk with
  laptop closed, notebooks, headphones, a mug, soft diffuse grey light.`
- **Noite:** `[mesmo texto] … at night in the rain: window full of blurred neon reflections in vermilion and
  indigo, wet city lights below, warm desk lamp on, rain streaks catching the light.`

## 4. Cafeteria à noite (`cafe`)
- **Dia:** `[estilo] A tiny Japanese kissaten café corner by the window: wooden counter seat, a cup of coffee and
  a slice of cake on a plate, a noren curtain with a simple wave pattern, potted plants, street with a few
  shop signs (no readable text) outside, late-morning light.`
- **Noite:** `[mesmo texto] … at night: street outside lit by warm paper lanterns and a vending machine glow,
  pendant lamps inside casting amber light, steam rising from the coffee, deep indigo sky.`

## Dicas
- Gere o **dia** primeiro e use a mesma semente/referência para a **noite**, para o cômodo ficar igual.
- Se aparecer texto ou letreiro legível, gere de novo (o app não deve ter texto na imagem).
- Evite personagens: a Mochi é desenhada por cima, no canto inferior direito.
