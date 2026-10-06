# Workflow — Reglas de negocio

Cada regla tiene un identificador para poder referenciarla desde código, pruebas
y discusiones. Dónde se hace cumplir: **DB** (PostgreSQL: CHECK/trigger/RPC/RLS),
**SRV** (Server Action), **UI** (interfaz).

## 1. Flujo general

```
COMPRA / ENTRADA → EXISTENCIA → RESERVA → ORDEN DE TRABAJO → CONSUMO REAL
                → MERMA / RETAZO → CIERRE DE LA ORDEN → COSTO REAL DEL TRABAJO
```

## 2. Conceptos de stock

| Concepto | Definición |
|----------|-----------|
| **Stock físico** (`stock_on_hand`) | Material que está físicamente en la empresa. |
| **Stock reservado** (`stock_reserved`) | Parte del físico comprometida para órdenes. |
| **Stock disponible** | `físico − reservado`. Es lo que se puede prometer a una nueva orden. |
| **Valor de inventario** | `físico × costo promedio`. |

## 3. Inventario (INV)

| ID | Regla | Dónde |
|----|-------|-------|
| INV-01 | Todo cambio de stock genera un registro en `inventory_movements`. No existe otra forma de cambiar el stock. | DB |
| INV-02 | Los movimientos son inmutables. Un error se corrige con un movimiento inverso (anulación o ajuste) que referencia al original. | DB |
| INV-03 | Cada movimiento guarda cantidad, saldo anterior y saldo nuevo (físico y reservado), usuario, fecha, OT opcional, referencia y observación. | DB |
| INV-04 | El stock disponible no puede quedar negativo. Tampoco el físico. | DB |
| INV-05 | Excepción: un usuario con permiso `inventory.allow_negative` (Administrador) puede autorizar explícitamente una operación que deje stock negativo. Queda marcada (`negative_override`) y auditada. | DB |
| INV-06 | Las operaciones de stock son transaccionales y bloquean la fila del material (`FOR UPDATE`). | DB |
| INV-07 | Cantidades siempre > 0 y con la precisión de la unidad base (`units.decimals`; p. ej. tornillos = enteros). | DB + SRV + UI |
| INV-08 | La unidad base de un material no puede cambiarse si el material ya tiene movimientos. | DB |
| INV-09 | Un material inactivo no admite entradas, reservas ni consumos, pero conserva su historial. | DB |
| INV-10 | El stock y los costos de un material **no se editan** en el formulario del material. La existencia inicial se registra al crearlo (genera un ajuste "Inventario inicial"; basta el permiso `materials.manage`) o mediante ajustes (`inventory.adjust`). | DB + UI |

## 4. Costos (CST)

| ID | Regla |
|----|-------|
| CST-01 | Costeo por **promedio ponderado móvil**: en cada entrada `nuevo_promedio = (físico × promedio + cantidad × costo) / (físico + cantidad)`. Si el físico previo es ≤ 0, el promedio pasa a ser el costo de la entrada. |
| CST-02 | `last_cost` = costo unitario de la última entrada. Si aún no hay entradas, toma el costo de la existencia inicial (o del primer ajuste positivo). |
| CST-03 | Salidas, consumos y mermas se valoran al costo promedio **vigente en ese momento**; ese costo queda congelado en el movimiento y en el consumo. |
| CST-04 | Reservas y liberaciones no tienen valor monetario. |
| CST-05 | Costo estimado de una OT = Σ (cantidad planificada × costo promedio al planificar). |
| CST-06 | Costo real de una OT = Σ costo de consumos + Σ costo de mermas (no anulados). |
| CST-07 | Moneda: RD$ (configurable en `app_settings`). |

## 5. Entradas (ENT)

| ID | Regla |
|----|-------|
| ENT-01 | Una entrada tiene número automático (ENT-000001), fecha, proveedor opcional, factura opcional, observaciones y una o más líneas. |
| ENT-02 | Cada línea: material, cantidad, unidad, costo unitario, costo total (= cantidad × costo). |
| ENT-03 | Registrar una entrada aumenta el stock físico (movimiento `entry`) y recalcula el promedio (CST-01). |
| ENT-04 | v1: la unidad de la línea debe ser la unidad base del material (factor 1). La estructura ya guarda `unit_id`, `conversion_factor` y `base_quantity` para conversiones futuras (p. ej. comprar en rollos y controlar en m²). |
| ENT-05 | Una entrada no se borra; se anula con motivo (permiso `inventory.void`). La anulación genera una salida inversa por línea al costo original (revierte el costo promedio) y solo es posible si hay stock disponible suficiente de **todos** los materiales; si no, no se anula nada. |
| ENT-06 | La fecha de una entrada no puede ser futura. Cada línea debe respetar la precisión de la unidad del material (se valida en el formulario y en la BD). |

## 5.1 Ajustes (AJU)

| ID | Regla |
|----|-------|
| AJU-01 | Un ajuste corrige diferencias de inventario (conteo físico, corrección de un registro, material encontrado u otro motivo descrito). No sustituye a las entradas (compras) ni a los consumos de órdenes. Requiere `inventory.adjust`. |
| AJU-02 | Ajuste positivo: se valora al costo indicado (por defecto, el promedio actual) y recalcula el promedio. Ajuste negativo: se valora al promedio vigente y no lo cambia. |
| AJU-03 | Un ajuste negativo no puede dejar el disponible en negativo (INV-04), salvo la excepción explícita de un administrador (INV-05). |
| AJU-04 | Cada ajuste tiene número (AJ-000001), queda en el kardex con su motivo y en la auditoría, y no se puede modificar ni borrar. |

## 6. Órdenes de trabajo (OT)

| ID | Regla |
|----|-------|
| OT-01 | Número automático OT-000001. Datos: cliente, nombre del trabajo, descripción, fecha requerida, responsable, prioridad, estado. |
| OT-02 | Estados: Borrador → Pendiente → Planificada → En producción → En instalación → Terminada. Cancelada desde cualquier estado no terminado. |
| OT-03 | Transiciones: hacia adelante (se puede saltar etapas), retroceso de **un** paso, y cancelación desde cualquier estado no terminado (con motivo). Solo se termina desde *En producción* o *En instalación*. Una OT Terminada o Cancelada es de solo lectura; reabrirla requiere `work_orders.reopen` (Administrador) y la deja *En producción*. El estado solo cambia mediante la función `change_work_order_status` (las reglas viven en la BD). |
| OT-04 | Todo cambio de estado se registra en el timeline (`work_order_events`) con usuario y fecha. |
| OT-05 | Una OT está **atrasada** si `fecha requerida < hoy` y su estado no es Terminada ni Cancelada. |
| OT-06 | La duración de una OT = `completed_at − started_at` (inicio = primera vez que pasa a *En producción*). |
| OT-07 | Cancelar una OT libera automáticamente todas sus reservas activas. Los consumos ya registrados permanecen (el material ya se usó). |

### 6.1 Materiales planificados (PLN)

| ID | Regla |
|----|-------|
| PLN-01 | Cada OT tiene una lista de materiales planificados: material, cantidad estimada, costo unitario estimado (promedio al planificar) y costo estimado. |
| PLN-02 | Un material aparece una sola vez por OT (se edita la cantidad). |
| PLN-03 | El estimado se puede editar mientras la OT no esté Terminada/Cancelada; los cambios quedan en el timeline. |

### 6.2 Reservas (RES)

| ID | Regla |
|----|-------|
| RES-01 | Se puede reservar material **planificado** de una OT en estado Pendiente, Planificada, En producción o En instalación (`work_orders.reserve`). |
| RES-02 | Solo se reserva hasta el stock **disponible** (INV-04). |
| RES-03 | Una reserva aumenta `stock_reserved` (movimiento `reservation`); no cambia el físico. |
| RES-04 | Liberar una reserva (total o parcial) genera `reservation_release`. |
| RES-05 | Al consumir o mermar material de una OT, primero se descuenta de las reservas activas de esa OT (FIFO); el resto sale del disponible. |
| RES-06 | Al cerrar o cancelar una OT, las reservas sobrantes se liberan automáticamente. |

### 6.3 Consumo real (CON)

| ID | Regla |
|----|-------|
| CON-01 | Consumo = material **útil** realmente utilizado en el trabajo. Se registra durante *En producción* o *En instalación*. |
| CON-02 | Puede registrarse consumo o merma de un material no planificado: se agrega a la OT como línea "no planificada" (estimado 0), para que su costo cuente en el real y la diferencia sea visible. |
| CON-03 | Variación = (consumo + merma) − estimado. Variación % = variación / estimado × 100. |
| CON-04 | Si la variación % supera `consumption_variance_alert_pct` (10 % por defecto) se resalta en rojo y genera alerta. Si es menor que el estimado se resalta como ahorro. |
| CON-05 | Un consumo no se borra ni se edita: se **anula** con motivo (permiso `inventory.void`, Administrador y Supervisor). La anulación genera una devolución (`return`) al stock al mismo costo unitario del consumo, resta la cantidad y el costo de la línea y del costo real de la OT, y queda en el historial. |
| CON-06 | Solo se anulan consumos o mermas de una OT En producción o En instalación. Para corregir una OT cerrada, un administrador la reabre primero. Lo anulado no vuelve a quedar reservado. |

### 6.4 Mermas (MER)

| ID | Regla |
|----|-------|
| MER-01 | Merma = desperdicio. Se registra **independientemente** del consumo: material, cantidad, motivo, OT (opcional), usuario, fecha, observaciones. |
| MER-02 | La merma descuenta stock físico (movimiento `waste`) y suma al costo real de la OT. |
| MER-03 | Ejemplo: se usaron 11.3 m² en total → consumo útil 10.5 m² + merma 0.8 m². Total = 11.3 m², comparado contra el estimado de 10 m² → +13 %. |
| MER-04 | Motivos: Error de impresión, Corte, Daño, Prueba, Instalación, Defecto, Otro (Otro exige observación). |
| MER-05 | Merma de almacén (sin OT) es válida (p. ej. material dañado por humedad). Requiere `inventory.adjust`, motivo, y solo descuenta del **disponible** (no de lo reservado por órdenes); nunca deja stock negativo. |
| MER-07 | Una merma se anula igual que un consumo (CON-05): devolución al mismo costo, con motivo; si era de una OT, aplica CON-06. |
| MER-06 | Alerta de merma considerable: merma de una OT > `waste_alert_pct` (5 % por defecto) del consumo total de ese material. |

### 6.5 Cierre (CIE)

| ID | Regla |
|----|-------|
| CIE-01 | Al pasar a Terminada se muestra el resumen: costo estimado, costo real, variación RD$ y %, materiales utilizados, merma, responsable y duración. |
| CIE-02 | El costo real (`actual_material_cost`) se actualiza en vivo con cada consumo y merma. Al cerrar: se liberan las reservas sobrantes y se fija `completed_at`; como ya no se aceptan consumos, el costo real queda definitivo. |
| CIE-03 | Después del cierre no se aceptan consumos ni mermas (salvo reapertura auditada). |

## 7. Retazos (RET) — preparado, Fase 5

| ID | Regla |
|----|-------|
| RET-01 | Un retazo es una pieza sobrante identificable: material, ancho × largo, área, ubicación, estado. |
| RET-02 | El área de los retazos **ya está incluida** en el stock físico; registrar un retazo no aumenta el stock. |
| RET-03 | Tener 5 m² en retazos pequeños no equivale a una pieza utilizable de 5 m²: la UI mostrará el stock en "piezas completas" vs "retazos" para materiales con `tracks_remnants`. |
| RET-04 | Usar un retazo en una OT genera un consumo normal del material y marca el retazo como Usado. |

## 8. Alertas (ALR)

| ID | Condición |
|----|-----------|
| ALR-01 | Stock disponible ≤ stock mínimo (material activo). Disponible ≤ 0 se muestra como "Sin existencia". |
| ALR-02 | Una OT excede el material estimado (CON-04): OT En producción / En instalación, o terminada en los últimos 30 días, con estimado > 0 y variación % > `consumption_variance_alert_pct`. |
| ALR-03 | OT atrasada (OT-05). |
| ALR-04 | Merma considerable (MER-06): en una OT abierta o terminada en los últimos 30 días, la merma de un material supera `waste_alert_pct` de lo usado (consumo + merma) de ese material en la OT. |

En v1 las alertas se **calculan** al consultar (función `get_alerts`). No se guardan
notificaciones hasta definir canales (correo, push). Todos los usuarios ven las
alertas.

## 8.1 Reportes (REP)

| ID | Regla |
|----|-------|
| REP-01 | Consumo y merma se toman de los registros **no anulados** (D-030). Un consumo anulado no cuenta en ningún reporte ni en el dashboard. |
| REP-02 | Los períodos son fechas del negocio (zona `America/Santo_Domingo`), con inicio y fin incluidos. Por defecto: el mes en curso. |
| REP-03 | Consumo por material: cantidad y costo de consumo útil, cantidad y costo de merma, total y % de merma sobre lo usado, en el período. |
| REP-04 | Costo por orden (estimado vs real): órdenes **terminadas** en el período, con costo estimado, real, merma, variación RD$ y %. |
| REP-05 | Consumo por cliente: costo de consumo y merma del período agrupado por el cliente de la OT; las OT sin cliente aparecen como "Sin cliente". |
| REP-06 | Inventario actual: existencia física, reservada, disponible, costo promedio y valor (físico × promedio) por material, con totales por categoría. No depende del período. |
| REP-07 | Todo reporte se puede exportar a CSV (D-031) con los mismos filtros que se ven en pantalla. |

## 9. Permisos

| Permiso | Admin | Supervisor | Almacén | Producción | Consulta |
|---------|:----:|:---------:|:------:|:---------:|:-------:|
| Ver (lectura general, reportes) | ✔ | ✔ | ✔ | ✔ | ✔ |
| `catalog.manage` — categorías, unidades, ubicaciones | ✔ | ✔ | | | |
| `materials.manage` — crear/editar materias primas | ✔ | ✔ | ✔ | | |
| `suppliers.manage` | ✔ | ✔ | ✔ | | |
| `customers.manage` | ✔ | ✔ | | | |
| `inventory.receive` — entradas | ✔ | ✔ | ✔ | | |
| `inventory.adjust` — ajustes | ✔ | ✔ | | | |
| `inventory.void` — anulaciones | ✔ | ✔ | | | |
| `inventory.allow_negative` | ✔ | | | | |
| `work_orders.manage` — crear/editar/estado | ✔ | ✔ | | | |
| `work_orders.reserve` — reservar/liberar | ✔ | ✔ | ✔ | | |
| `work_orders.consume` — consumos y mermas | ✔ | ✔ | ✔ | ✔ | |
| `work_orders.close` — cerrar | ✔ | ✔ | | | |
| `work_orders.reopen` — reabrir OT cerrada | ✔ | | | | |
| `audit.view` | ✔ | ✔ | | | |
| `users.manage` | ✔ | | | | |
| `settings.manage` | ✔ | | | | |

## 9.1 Usuarios (USR)

| ID | Regla |
|----|-------|
| USR-01 | Solo el Administrador (`users.manage`) crea usuarios, cambia roles, activa/desactiva y restablece contraseñas. |
| USR-02 | Un usuario nuevo o con contraseña restablecida recibe una contraseña temporal y debe elegir una nueva antes de usar el sistema. |
| USR-03 | Nadie puede cambiar su propio rol ni desactivarse (evita quedarse sin administrador). |
| USR-04 | Los usuarios no se borran: se desactivan. Un usuario inactivo no puede ingresar ni ver datos, y su historial (movimientos, auditoría) se conserva con su nombre. |

## 10. Auditoría (AUD)

| ID | Regla |
|----|-------|
| AUD-01 | Se registran creación y modificación de catálogos, materiales, órdenes, perfiles, permisos y configuración, con valores anteriores y nuevos. |
| AUD-02 | Toda operación de inventario registra un evento legible: "Ana registró la entrada ENT-000012 (3 líneas, RD$ 45,300.00)". |
| AUD-03 | No se permite eliminar información crítica. Se usa desactivación (`is_active`) o anulación con motivo. |
| AUD-04 | El registro de auditoría es de solo lectura para todos. |
