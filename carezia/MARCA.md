# Carezia · Manual de marca

Documento vivo. Lo que está aquí se refleja en el código: la paleta vive en
`apps/web/src/app/globals.css` y `apps/mobile/src/theme.ts`, y los textos de la
portada se editan desde `/admin/ajustes` sin tocar nada.

---

## 1. Qué es Carezia

Un centro de estética facial y corporal que trabaja con criterio clínico y sin
promesas infladas. No vende transformaciones: vende un proceso con seguimiento.

**Nombre.** De *care* (cuidado) con una terminación suave, latina, femenina sin
ser infantil. Se pronuncia *ca-re-sia*.

---

## 2. Misión

Hacer que el cuidado de la piel sea una decisión informada y no una compra por
impulso: diagnóstico real, protocolos progresivos y expectativas honestas.

## 3. Visión

Ser el lugar al que una persona vuelve durante años porque le dijimos la verdad
sobre su piel, incluso cuando esa verdad significaba venderle menos.

## 4. Valores

1. **Diagnóstico antes que catálogo.** Ninguna sesión empieza sin entender qué
   necesita esa piel ese día.
2. **Progresión, no milagros.** Los resultados se construyen por capas. Lo
   decimos antes de cobrar, no después.
3. **Transparencia total.** Precio, duración y alcance publicados. Lo que se ve
   en la web es lo que se cobra en el box.
4. **Menos es más.** Si un tratamiento no aporta, no se recomienda, aunque esté
   en la lista de precios.

---

## 5. Voz de marca

**Cómo suena:** serena, precisa, adulta. Habla de tú. Explica el porqué.

**Cómo no suena:** urgente, aspiracional vacía, ni con lenguaje de rebaja.

| Sí decimos | No decimos |
|---|---|
| «Tu piel necesita constancia, no intensidad.» | «¡Resultados desde la primera sesión!» |
| «Esta sesión no borra la mancha, la aclara un grado.» | «Adiós manchas para siempre» |
| «Te conviene esperar dos semanas entre sesiones.» | «¡Últimos cupos, reserva ya!» |
| «No te lo recomiendo para tu tipo de piel.» | «Este es nuestro tratamiento estrella» |

**Reglas de escritura**

- Frases cortas. Una idea por frase.
- Cifras concretas: «75 minutos», «4 sesiones», «6 meses de vigencia».
- Sin signos de exclamación en textos de producto.
- Sin emojis en la web. En redes, como máximo uno y nunca en el primer renglón.
- Nunca se promete un resultado que dependa de factores que no controlamos.

**Cómo hablamos de precios.** Siempre visible, siempre completo, nunca «desde».
Si hay un abono para reservar, se dice en la misma pantalla.

---

## 6. Estética

### Paleta

| Token | Hex | Uso |
|---|---|---|
| Crema | `#FBF7F2` | Fondo general. Es el aire de la marca. |
| Arena | `#EDE3D8` | Separadores, fondos de sección, estados vacíos. |
| Arena oscura | `#DDCDBC` | Bordes de campos y botones secundarios. |
| Tinta | `#2A2422` | Texto principal. Nunca negro puro. |
| Tinta suave | `#6B5F58` | Texto secundario y descripciones. |
| Tinta tenue | `#9B8E86` | Metadatos, ayudas, textos deshabilitados. |
| Cobre | `#B0705A` | Color de acción: botones, enlaces, precios. |
| Cobre oscuro | `#93583F` | Hover y mensajes de error. |
| Salvia | `#7F9184` | Confirmaciones y estados positivos. |
| Salvia clara | `#E6ECE6` | Fondo de etiquetas y avisos de éxito. |

El cobre es el único color saturado. Si aparece en más de dos elementos por
pantalla, pierde su función: deja de significar «aquí se hace clic».

### Tipografía

- **Fraunces** para títulos. Serif con carácter, en peso 500. Interletrado
  ligeramente negativo (`-0.015em`).
- **Inter** para todo lo demás. Cuerpo en 15–16 px, altura de línea 1.5 mínimo.

Nunca se usa la serif en párrafos largos ni en botones.

### Formas y espacio

- Botones completamente redondeados (pastilla). Tarjetas con radio de 20 px.
- Márgenes generosos: la sensación de calma viene del espacio vacío, no de un
  adorno. En dudas, se quita un elemento antes de agregar uno.
- Fotografía: luz natural, piel real con textura visible, sin retoque de poros.
  Nunca stock de manos con flores.

### Accesibilidad

Todo texto sobre crema o blanco cumple contraste AA. El foco de teclado es
visible en toda la web (contorno cobre de 2 px). Se respeta
`prefers-reduced-motion`.

---

## 7. Aplicación en redes

**Instagram (`@carezia.cl`)** — cuenta principal.

- **Grilla:** alternancia de tres tipos de post. (1) Educativo sobre piel,
  fondo crema con tipografía Fraunces. (2) Resultado real con la condición
  explicada: qué se trató, cuántas sesiones, qué no cambió. (3) Detrás de
  escena: producto, textura, mano trabajando.
- **Nunca:** antes y después sin contexto de tiempo ni número de sesiones.
- **Stories:** agenda del día, recordatorios de cuidado, respuestas a preguntas.
  Siempre con el enlace de reserva.
- **Bio:** `Estética consciente · Providencia` + enlace directo a `/reservar`.

**Facebook** — mismo contenido, publicado como resumen semanal. El público
llega por búsqueda, no por descubrimiento: se priorizan publicaciones que
expliquen servicios completos con precio.

**Regla transversal:** ningún contenido promete un resultado que la web no
pueda respaldar en su descripción de servicio.

---

## 8. Checklist antes de publicar cualquier pieza

- [ ] ¿El precio, la duración y el alcance son los mismos que en la web?
- [ ] ¿Hay una sola acción clara en la pieza?
- [ ] ¿Se puede leer el texto sobre la imagen sin esfuerzo?
- [ ] ¿Se prometió algo que dependa de factores que no controlamos?
- [ ] ¿El cobre está reservado para la acción principal?
