<template>
  <div class="kg-wrap">
    <div v-if="!hasGraph" class="kg-empty">
      <p>该案件未提取到可展示的实体关系</p>
    </div>
    <template v-else>
      <div class="kg-meta">
        <span>实体 {{ nodeCount }} 个 · 关系 {{ edgeCount }} 条</span>
        <span class="kg-hint">拖动节点调整布局 · 滚轮缩放 · 拖动空白平移</span>
      </div>
      <div class="kg-canvas" ref="canvasEl">
        <svg :viewBox="'0 0 ' + W + ' ' + H" class="kg-svg"
          @pointerdown="onBgDown" @pointermove="onBgMove" @pointerup="onBgUp"
          @pointercancel="onBgUp" @wheel.prevent="onWheel">
          <defs>
            <pattern id="kg-dot-grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.4" cy="1.4" r="1.4" fill="#dbe2ec" />
            </pattern>
            <marker id="kg-arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#98a4b6" />
            </marker>
          </defs>
          <rect :width="W" :height="H" rx="8" fill="url(#kg-dot-grid)" />
          <g :transform="'translate(' + tx + ', ' + ty + ') scale(' + k + ')'">
            <!-- 关系边 -->
            <g v-for="(e, i) in edges" :key="'e' + i">
              <line :x1="e.a.x" :y1="e.a.y" :x2="e.b.x" :y2="e.b.y"
                class="kg-edge" :class="{ 'kg-edge--dim': dimActive && !e.hot }"
                marker-end="url(#kg-arrow)" />
              <g v-if="showLabels" :transform="'translate(' + ((e.a.x + e.b.x) / 2) + ', ' + ((e.a.y + e.b.y) / 2) + ')'">
                <text class="kg-edge-label" :class="{ 'kg-edge-label--hot': e.hot, 'kg-edge-label--long': e.type.length > 10 }" text-anchor="middle">{{ e.type }}</text>
              </g>
            </g>
            <!-- 实体节点 -->
            <g v-for="n in nodes" :key="n.name" :transform="'translate(' + n.x + ', ' + n.y + ')'"
              :class="{ 'kg-node--dim': dimActive && !n.hot }"
              @pointerdown.stop="onNodeDown($event, n)"
              @pointerenter="onNodeEnter(n)" @pointerleave="onNodeLeave(n)">
              <circle r="11" :fill="colorForType(n.type)" class="kg-node-circle"
                :class="{ 'kg-node--victim': n.name === victim, 'kg-node--suspect': n.name === suspect, 'kg-node--hover': hoverName === n.name }" />
              <text y="-24" class="kg-node-type" text-anchor="middle">{{ n.type }}</text>
              <text y="28" class="kg-node-name" text-anchor="middle">{{ n.name }}</text>
            </g>
          </g>
        </svg>
        <div class="kg-zoom-controls">
          <button @click="zoomBy(1.25)" title="放大" aria-label="放大">+</button>
          <button @click="zoomBy(0.8)" title="缩小" aria-label="缩小">−</button>
          <button @click="resetView" title="重置视图" aria-label="重置视图">⟳</button>
        </div>
      </div>
      <div class="kg-legend">
        <span v-for="t in legendTypes" :key="t.label" class="kg-legend-item">
          <i class="kg-legend-dot" :style="{ background: t.color }"></i>{{ t.label }}
        </span>
        <span v-if="victim" class="kg-legend-item">
          <i class="kg-legend-ring kg-ring-victim"></i>受害者
        </span>
        <span v-if="suspect" class="kg-legend-item">
          <i class="kg-legend-ring kg-ring-suspect"></i>嫌疑人
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

interface GraphNode {
  name: string
  type: string
}
interface GraphRelation {
  from: string
  type: string
  to: string
}
interface GraphData {
  nodes?: GraphNode[]
  relations?: GraphRelation[]
}

const props = defineProps<{
  graph: GraphData | null
  victim?: string
  suspect?: string
}>()

interface SimNode {
  name: string
  type: string
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  hot: boolean
}
interface SimEdge {
  a: SimNode
  b: SimNode
  type: string
  hot: boolean
}

const hasGraph = computed(() =>
  !!props.graph && Array.isArray(props.graph.nodes) && props.graph.nodes.length > 0
)
const nodeCount = computed(() => (props.graph?.nodes || []).length)
const edgeCount = computed(() => (props.graph?.relations || []).length)
const showLabels = computed(() => edgeCount.value <= 24)

// ---- 实体类型配色（沉稳、专业） ----
const TYPE_STYLES: { match: RegExp; color: string; label: string }[] = [
  { match: /手机|电话|PHONE/i, color: '#0f766e', label: '手机/电话' },
  { match: /身份证|证件|ID_CARD/i, color: '#b45309', label: '证件' },
  { match: /银行|账户|账号|卡|银行卡|转账|金额|资金|钱|交易|MONEY|BANK_CARD|ACCOUNT|AMOUNT/i, color: '#9a3412', label: '资金/账户' },
  { match: /微信|QQ|网址|链接|URL|邮箱|抖音|平台|WECHAT/i, color: '#0891b2', label: '网络身份' },
  { match: /公司|机构|组织|单位|企业|ORGANIZATION|COMPANY/i, color: '#475569', label: '机构' },
  { match: /地址|地点|位置|住址|ADDRESS|LOCATION/i, color: '#64748b', label: '地点' },
  { match: /人|受害者|嫌疑人|骗子|先生|女士|小姐|师傅|经理|老板|PERSON/i, color: '#1d4ed8', label: '人员' },
]
function styleForType(type: string) {
  const t = (type || '').trim()
  for (const s of TYPE_STYLES) {
    if (s.match.test(t)) return s
  }
  return { match: /$^/, color: '#94a3b8', label: '其他' }
}
function colorForType(type: string): string {
  return styleForType(type).color
}
const legendTypes = computed(() => {
  if (!props.graph?.nodes) return []
  const seen: { label: string; color: string }[] = []
  for (const n of props.graph.nodes) {
    const s = styleForType(n.type)
    if (!seen.some(x => x.label === s.label)) seen.push({ label: s.label, color: s.color })
  }
  return seen
})

// ---- 力导向模拟（持续运行，支持拖拽） ----
const nodes = reactive<SimNode[]>([])
const edges = ref<SimEdge[]>([])

function build() {
  nodes.splice(0, nodes.length)
  edges.value = []
  if (!hasGraph.value || !props.graph?.nodes) return
  const seen = new Map<string, SimNode>()
  for (const n of props.graph.nodes) {
    if (!n.name || seen.has(n.name)) continue
    seen.set(n.name, {
      name: n.name,
      type: n.type || '其他',
      x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null,
      hot: true,
    })
  }
  const list = [...seen.values()]
  const idx = new Map(list.map((n, i) => [n.name, i]))
  const N = list.length
  const radius = Math.max(90, N * 30)
  list.forEach((n, i) => {
    const a = (2 * Math.PI * i) / N - Math.PI / 2
    n.x = Math.cos(a) * radius
    n.y = Math.sin(a) * radius
  })
  const merged = new Map<string, { a: SimNode; b: SimNode; types: Set<string> }>()
  for (const r of props.graph.relations || []) {
    if (!r.from || !r.to || r.from === r.to) continue
    const s = idx.get(r.from)
    const t = idx.get(r.to)
    if (s === undefined || t === undefined) continue
    const key = s + '||' + t
    const entry = merged.get(key)
    if (entry) {
      entry.types.add(r.type || '关联')
    } else {
      merged.set(key, { a: list[s]!, b: list[t]!, types: new Set([r.type || '关联']) })
    }
  }
  for (const m of merged.values()) {
    edges.value.push({ a: m.a, b: m.b, type: [...m.types].join(' · '), hot: false })
  }
  nodes.push(...list)
  alpha = 0.5
  settledFit = false
  scheduleFit()
}

const ideal = 195
let alpha = 0
let settledFit = false
function step() {
  if (alpha <= 0.02) return
  const N = nodes.length
  // 两两斥力
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const a = nodes[i]!
      const b = nodes[j]!
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = Math.max(dx * dx + dy * dy, 40)
      const d = Math.sqrt(d2)
      const f = (3300 * alpha) / d2
      const fx = (dx / d) * f
      const fy = (dy / d) * f
      a.vx += fx
      a.vy += fy
      b.vx -= fx
      b.vy -= fy
    }
  }
  // 关系弹簧
  for (const e of edges.value) {
    const a = e.a
    const b = e.b
    const dx = a.x - b.x
    const dy = a.y - b.y
    const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
    const f = (d - ideal) * 0.03 * alpha
    const fx = (dx / d) * f
    const fy = (dy / d) * f
    a.vx -= fx
    a.vy -= fy
    b.vx += fx
    b.vy += fy
  }
  // 中心引力 + 阻尼 + 积分
  for (const n of nodes) {
    n.vx -= n.x * 0.004 * alpha
    n.vy -= n.y * 0.004 * alpha
    n.vx *= 0.86
    n.vy *= 0.86
    if (n.fx !== null) {
      n.x = n.fx
      n.vx = 0
    } else {
      n.x += n.vx
    }
    if (n.fy !== null) {
      n.y = n.fy
      n.vy = 0
    } else {
      n.y += n.vy
    }
  }
  alpha *= 0.988
  if (alpha <= 0.02 && !settledFit) {
    settledFit = true
    fitView()
  }
}

let rafId = 0
function loop() {
  step()
  rafId = requestAnimationFrame(loop)
}

// ---- 视图变换（缩放/平移） ----
const W = 900
const H = 600
const k = ref(1)
const tx = ref(0)
const ty = ref(0)
const canvasEl = ref<HTMLElement | null>(null)

function clampK(v: number) {
  return Math.max(0.3, Math.min(2.6, v))
}

function toWorld(clientX: number, clientY: number) {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return { x: 0, y: 0 }
  // 元素像素 -> viewBox 像素（画布宽度随窗口变化，不能按 1:1 处理）
  const sx = rect.width / W
  const sy = rect.height / H
  const vx = (clientX - rect.left) / sx
  const vy = (clientY - rect.top) / sy
  return {
    x: (vx - tx.value) / k.value,
    y: (vy - ty.value) / k.value,
  }
}

function fitView() {
  if (nodes.length === 0) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x)
    maxY = Math.max(maxY, n.y)
  }
  const bw = Math.max(maxX - minX, 60)
  const bh = Math.max(maxY - minY, 60)
  const k2 = clampK(Math.min((W - 120) / bw, (H - 130) / bh, 1.4))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  k.value = k2
  tx.value = W / 2 - k2 * cx
  ty.value = H / 2 - k2 * cy
}

function zoomBy(factor: number) {
  const k2 = clampK(k.value * factor)
  tx.value = W / 2 - (W / 2 - tx.value) * (k2 / k.value)
  ty.value = H / 2 - (H / 2 - ty.value) * (k2 / k.value)
  k.value = k2
}

function resetView() {
  fitView()
}

function onWheel(ev: WheelEvent) {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  // 元素像素 -> viewBox 像素（画布宽度随窗口变化，不能按 1:1 处理）
  const sx = rect.width / W
  const sy = rect.height / H
  const vx = (ev.clientX - rect.left) / sx
  const vy = (ev.clientY - rect.top) / sy
  const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15
  const k2 = clampK(k.value * factor)
  tx.value = vx - (vx - tx.value) * (k2 / k.value)
  ty.value = vy - (vy - ty.value) * (k2 / k.value)
  k.value = k2
}

// ---- 拖拽节点 ----
let dragNode: SimNode | null = null
let dragging = false

function onNodeDown(ev: PointerEvent, n: SimNode) {
  ev.preventDefault()
  const target = ev.currentTarget as Element | null
  if (target) {
    try {
      target.setPointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
  }
  dragNode = n
  dragging = true
  alpha = Math.max(alpha, 0.35)
  const p = toWorld(ev.clientX, ev.clientY)
  n.fx = p.x
  n.fy = p.y
  n.x = p.x
  n.y = p.y
  n.vx = 0
  n.vy = 0
}
function onBgMove(ev: PointerEvent) {
  if (dragNode) {
    const p = toWorld(ev.clientX, ev.clientY)
    dragNode.fx = p.x
    dragNode.fy = p.y
    dragNode.x = p.x
    dragNode.y = p.y
  } else if (panning) {
    tx.value = panStartTx + (ev.clientX - panStartX)
    ty.value = panStartTy + (ev.clientY - panStartY)
  }
}
function onBgUp(_ev?: PointerEvent) {
  if (dragNode) {
    dragNode.fx = null
    dragNode.fy = null
    dragNode = null
    alpha = Math.max(alpha, 0.35)
  }
  dragging = false
  panning = false
}

// ---- 平移画布 ----
let panning = false
let panStartX = 0
let panStartY = 0
let panStartTx = 0
let panStartTy = 0

function onBgDown(ev: PointerEvent) {
  if (dragging) return
  panning = true
  panStartX = ev.clientX
  panStartY = ev.clientY
  panStartTx = tx.value
  panStartTy = ty.value
}

// ---- 悬停高亮 ----
const hoverName = ref('')
const dimActive = computed(() => hoverName.value !== '')

function hotSet(name: string) {
  const neighbors = new Set<string>([name])
  for (const e of edges.value) {
    if (e.a.name === name) neighbors.add(e.b.name)
    if (e.b.name === name) neighbors.add(e.a.name)
  }
  return neighbors
}

function refreshHot() {
  const name = hoverName.value
  if (!name) {
    for (const n of nodes) n.hot = true
    for (const e of edges.value) e.hot = false
    return
  }
  const set = hotSet(name)
  for (const n of nodes) n.hot = set.has(n.name)
  for (const e of edges.value) e.hot = e.a.name === name || e.b.name === name
}

function onNodeEnter(n: SimNode) {
  hoverName.value = n.name
  refreshHot()
}
function onNodeLeave(_n?: SimNode) {
  hoverName.value = ''
  refreshHot()
}

let fitTimer = 0
function scheduleFit() {
  if (fitTimer) window.clearTimeout(fitTimer)
  fitTimer = window.setTimeout(() => {
    fitView()
    fitTimer = 0
  }, 500)
}

watch(() => props.graph, () => {
  build()
  refreshHot()
}, { immediate: true })

function onWindowUp() {
  onBgUp()
}

let resizeRaf = 0
function onCanvasResize() {
  if (resizeRaf) return
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    fitView()
  })
}
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  rafId = requestAnimationFrame(loop)
  window.addEventListener('pointerup', onWindowUp)
  window.addEventListener('pointercancel', onWindowUp)
  if (canvasEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(onCanvasResize)
    resizeObserver.observe(canvasEl.value)
  }
})
onUnmounted(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('pointerup', onWindowUp)
  window.removeEventListener('pointercancel', onWindowUp)
  resizeObserver?.disconnect()
  if (fitTimer) window.clearTimeout(fitTimer)
})
</script>

<style scoped>
.kg-wrap {
  width: 100%;
}

.kg-empty {
  padding: 40px 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  border: 1px dashed #d4dae3;
  border-radius: 8px;
  background: #f8fafc;
}

.kg-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
}

.kg-hint {
  color: #94a3b8;
  font-size: 11px;
}

.kg-canvas {
  position: relative;
  border: 1px solid #e5eaf0;
  border-radius: 8px;
  background: #fbfcfe;
  overflow: hidden;
}

.kg-svg {
  width: 100%;
  height: auto;
  display: block;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.kg-svg:active {
  cursor: grabbing;
}

.kg-edge {
  stroke: #aeb9c9;
  stroke-width: 1.3;
  transition: opacity 0.15s;
}

.kg-edge--dim {
  opacity: 0.12;
}

.kg-edge-label {
  font-size: 10px;
  fill: #8b96a5;
  paint-order: stroke;
  stroke: #fbfcfe;
  stroke-width: 3.5px;
}

.kg-edge-label--hot {
  fill: #334155;
  font-weight: 600;
  stroke-width: 4px;
}

.kg-edge-label--long {
  font-size: 9px;
}

.kg-node-circle {
  stroke: #ffffff;
  stroke-width: 2;
  filter: drop-shadow(0 1px 2px rgba(15, 23, 42, 0.22));
  cursor: grab;
  transition: opacity 0.15s;
}

.kg-node--victim {
  stroke: #ffffff;
  stroke-width: 2.5;
  stroke-dasharray: 4 3;
}

.kg-node--suspect {
  fill: #c2410c;
  stroke: #ffffff;
  stroke-width: 2.5;
}

.kg-node--hover circle {
  stroke-width: 3;
  filter: drop-shadow(0 2px 6px rgba(15, 23, 42, 0.3));
}

.kg-node--dim {
  opacity: 0.32;
}

.kg-node-type {
  font-size: 9.5px;
  fill: #7c8798;
  pointer-events: none;
  paint-order: stroke;
  stroke: #fbfcfe;
  stroke-width: 3px;
}

.kg-node-name {
  font-size: 12px;
  fill: #1e293b;
  font-weight: 600;
  pointer-events: none;
  paint-order: stroke;
  stroke: #fbfcfe;
  stroke-width: 3px;
}

.kg-zoom-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d8dfe9;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}

.kg-zoom-controls button {
  width: 28px;
  height: 28px;
  border: 1px solid #d8dfe9;
  background: #ffffff;
  color: #475569;
  font-size: 15px;
  line-height: 1;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, border-color 0.12s;
}

.kg-zoom-controls button:hover {
  background: #f1f5f9;
  border-color: #b9c4d2;
}

.kg-legend {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.kg-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}

.kg-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.kg-legend-ring {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  background: #fff;
}

.kg-ring-victim {
  background: #1d4ed8;
  outline: 2px dashed #1d4ed8;
  outline-offset: 2px;
}

.kg-ring-suspect {
  background: #c2410c;
}
</style>
