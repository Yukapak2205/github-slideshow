# Carezia · Manual de marca

Documento vivo. Lo que está aquí se refleja en el código: la paleta vive en
`apps/web/src/app/globals.css` y `apps/mobile/src/theme.ts`, y los textos de la
portada se editan desde `/admin/ajustes` sin tocar nada.

---

## 1. Qué es Carezia

Un centro de estética integral. No es una boutique facial ni un spa de
relajación: el catálogo real son 60 servicios en once frentes —depilación
láser, masajes reductivos y post operatorio, limpieza facial, uñas, cejas y
pestañas, Tensamax, Therapress y evaluación corporal InBody.

**Esa amplitud es el dato que manda.** La mitad del catálogo se vende en planes
de 8, 10 o 15 sesiones, no en visitas sueltas. Carezia no vive de que alguien
entre una vez: vive de que alguien se comprometa a un proceso de meses y lo
termine. Todo lo que sigue se ordena alrededor de eso.

**Nombre.** De *care* (cuidado) con una terminación suave y latina. Se pronuncia
*ca-re-sia*.

---

## 2. Misión

Acompañar procesos largos de cuidado corporal y facial con resultados medibles,
para que quien empieza un plan de diez sesiones llegue a la décima sabiendo
exactamente qué cambió.

## 3. Visión

Ser el lugar donde los tratamientos por sesiones se terminan. Que la referencia
de Carezia no sea «me hice una», sino «hice el plan completo y funcionó».

## 4. Valores

1. **La sesión número siete importa tanto como la primera.** El riesgo de un
   plan largo es el abandono a mitad de camino. La constancia se sostiene con
   seguimiento, no con descuentos.
2. **Se mide antes y se mide después.** Con InBody y con registro fotográfico
   cuando corresponde. Un resultado que no se puede mostrar es una opinión.
3. **Cada plan se explica completo antes de cobrarse.** Cuántas sesiones, cada
   cuánto, qué se espera a la mitad y qué al final. Nadie compra diez sesiones
   sin saber en qué se está metiendo.
4. **Lo que no corresponde, no se vende.** Si una piel o un cuerpo no es
   candidato a un tratamiento, se dice. Un plan mal vendido se abandona en la
   sesión tres y se lleva la confianza con él.

---

## 5. Voz de marca

**Cómo suena:** serena, precisa, adulta. Habla de tú. Explica el porqué.

**Cómo no suena:** urgente, aspiracional vacía, ni con lenguaje de rebaja.

| Sí decimos | No decimos |
|---|---|
| «Son ocho sesiones cada cuatro semanas. El resultado se ve desde la cuarta.» | «¡Resultados desde la primera sesión!» |
| «El láser reduce el vello, no lo elimina para siempre.» | «Adiós al vello definitivamente» |
| «Tu tipo de piel necesita más sesiones. Te conviene saberlo ahora.» | «¡Últimos cupos, reserva ya!» |
| «Este plan no es para ti. Te sirve más el otro.» | «Este es nuestro tratamiento estrella» |

**Reglas de escritura**

- Frases cortas. Una idea por frase.
- Cifras concretas: «75 minutos», «4 sesiones», «6 meses de vigencia».
- Sin signos de exclamación en textos de producto.
- Sin emojis en la web. En redes, como máximo uno y nunca en el primer renglón.
- Nunca se promete un resultado que dependa de factores que no controlamos.

**Cómo hablamos de precios.** Siempre visible, siempre completo, nunca «desde».
En un plan se muestran las dos cifras: el total y cuánto sale cada sesión. Si
hay un abono para reservar, se dice en la misma pantalla.

**Cómo hablamos de planes.** Número de sesiones, frecuencia y qué se espera en
cada tramo. Un plan de diez sesiones vendido sin calendario es una promesa vaga.

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

- **Grilla:** alternancia de tres tipos de post. (1) Educativo: cómo funciona el
  láser, por qué hay que esperar entre sesiones, qué hace el drenaje. (2)
  Resultado real con la condición explicada: qué se trató, **cuántas sesiones
  llevaba**, qué no cambió. (3) Detrás de escena: aparatología, textura, mano
  trabajando.
- **Nunca:** antes y después sin decir cuántas sesiones tomó. Es la regla que
  más se rompe en el rubro y la que más confianza destruye.
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
