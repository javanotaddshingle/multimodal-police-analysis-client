<script lang="ts">
// 定义从后端返回的完整数据结构
interface SimilarCase {
  content: string;
  fraud_type: string;
  score: number;
}

interface Judgment {
  case_id: string;
  is_fraud: boolean;
  fraud_type: string;
  confidence: string;
  confidence_score: number;
  reason: string;
  warning: string;
  deepfake_alert: boolean;
  similar_cases: SimilarCase[];
  timestamp: string;
  error: null | string;
}

interface Alert {
  type: string;
  level: string;
  title: string;
  message: string;
  warning: string;
  reason: string;
}

interface Stages {
  multimodal_ms: number;
  extraction_ms: number;
  storage_ms: number;
  judgment_ms: number;
  total_ms: number;
}

interface ApiResponse {
  case_id: string;
  judgment: Judgment;
  alerts: Alert[];
  deepfake_detected: boolean;
  elapsed_ms: number;
  stages: Stages;
}
// 定义从后端返回的完整数据结构


import { Base64 } from 'js-base64';
import { ref } from 'vue'
import axios from 'axios';

export default {
    data() {
        return {
            file_Info: null,
            base64Data: '' as string,
            case_id: '' as string,
            temp_text: '' as string,
            selectedFile: [] as Array<{ type: string; content: string }>,
            case_result: {} as any,
        }
    },

    methods: {
        handleBeforeUnload(event: Event) {
            // 如果有未保存的数据（比如 selectedFile 有内容），才拦截
            if (this.selectedFile.length > 0 || this.temp_text.length > 0 || this.case_id.length > 0) {
                event.preventDefault();
            }
        },
        // 提取类型前缀（image/video/audio/text/application 等）
        getFileCategory(type: string) {
            if (!type) return '未知'
            return type.split('/')[0] // "image/png" -> "image"
        },
        isValidCaseId(caseId: string): boolean {
            const trimmed = caseId.trim();
            // 1. 拒绝纯 "." 或 ".."
            if (trimmed === "." || trimmed === "..") {
                return false;
            }
            // 2. 正则：只允许 字母、数字、中文、- : () [] {} _ .
            //    [\u4e00-\u9fff] 代表基本汉字（与 Python 的范围基本一致）
            const pattern = /^[a-zA-Z0-9\u4e00-\u9fff\-:()\[\]{}\_.]+$/;
            return pattern.test(trimmed);
        },
        getBase64(ms: string) {
            return Base64.encode(ms)
        },
        getOriginalContent(ms: string) {
            console.log(Base64.decode(ms))
            console.log('hello')
            return Base64.decode(ms)
        },

        handleFileChange(event: Event) {
            const input = event.target as HTMLInputElement
            const files = input.files
            if (!files || files.length == 0) return

            for (var i = 0; i < files.length; i++) {
                const file = files[i]
                const reader = new FileReader()
                if (!file) continue
                const fileType = file.type || 'application/octet-stream'
                reader.onload = (event) => {
                    const content = event.target?.result as string
                    // 加入文件的类型和base64编码
                    this.selectedFile.push({
                        type: fileType,
                        content: content
                    })
                    console.log(`已读取: ${fileType}, 长度: ${content.length}`)
                }

                reader.readAsDataURL(file)
            }
        },
        submit_text() {
            if (this.temp_text === '') alert('请输入文本')
            this.selectedFile.push({
                type: 'text',
                content: this.temp_text
            })
            this.temp_text = ''
        },
        deleteSubmitItem(index: number) {
            this.selectedFile.splice(index, 1)
        },
        async submit() {
            if (this.case_id === '') {
                alert('请填写案件名称!')
                return
            }
            if (this.selectedFile.length === 0) {
                alert('请至少提交一条信息!')
                return
            }
            if (!this.isValidCaseId(this.case_id)) {
                alert('案件名称不合法，请重新填写!')
            }

            const payload = {
                case_id: this.case_id,
                inputs: this.selectedFile
            }
            console.log(payload)

            try {
                const res = await axios.post('http://127.0.0.1:8000/test', payload)
                console.log('succ', res.data)
                this.case_result = res.data
            } catch (err) {
                console.log('fail', err)
            }
        }

        // base64Encode() {
        //   const reader = new FileReader()
        //   // 这里的event是浏览器读完文件后产生的
        //   reader.onload = (event) => {
        //     this.base64Data = event.target?.result as string
        //     console.log('base64Data:', this.base64Data)
        //   }
        //   if(!this.selectedFile) {
        //     alert('请先选择文件')
        //     return
        //   }
        //   reader.readAsDataURL(this.selectedFile)
        // }
    },
    mounted() {
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    },
    beforeUnmount() {
        // 组件销毁时移除监听，防止内存泄漏
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    },

}
</script>

<template>
    <div id="submit_area" v-if="Object.keys(case_result).length === 0">
        <div class="analyse">
            <center>
                <p style="font-size:30px">请上传相关资料</p>
                <p style="font-size:15px">支持图片，纯文字文本(.txt),视频，音频，标*为必填</p>
            </center>
            <div style="display: flex;flex-direction: row;gap: 10px;">
                案件名称:
                <input type="text" v-model="case_id">
                <div style="color: red; flex-direction: column;" v-if="case_id === ''">
                    *请输入案件名称
                </div>
                <div style="color:red" v-if="!isValidCaseId(case_id)">案件名称不合法，请重新填写!</div>
            </div>
            <input type="file" accept="image/*,video/*,audio/*,.txt" @change="handleFileChange" ref="fileInput"
                multiple />

            <div>
                <p>您也可以手动输入文本信息:</p>
                <textarea v-model="temp_text" ref="textAreaRef" placeholder="请输入..."></textarea>
                <button @click="submit_text">提交</button>
            </div>
            <div class="encode">
                <div style="display: flex;flex-direction: row;gap:10px" v-for="(item, index) in selectedFile"
                    :key="index">
                    <p>
                        <strong>类型:</strong>{{ getFileCategory(item.type) }}
                    </p>
                    <p>
                        <strong>编码:(前50字符):</strong>{{ item.content.substring(0, 50) }}...
                    </p>
                    <button @click="deleteSubmitItem(index)">删除</button>

                </div>
            </div>
            <p v-if="selectedFile.length !== 0">共有{{ selectedFile.length }}条信息</p>
            <p v-if="selectedFile.length === 0">暂无文件</p>
            <div style="color: red; flex-direction: column;" v-if="selectedFile.length === 0">
                *请先选择文件
            </div>

            <button @click="submit">上传并分析</button>
            <div style="flex:1"></div>
        </div>
    </div>
    <div class="result-container">
        <!-- 核心前提：只有当 case_result 拿到真实数据时才渲染 -->
        <div v-if="Object.keys(case_result).length > 0" class="data-card">

            <!-- 1. 基础案件信息 -->
            <div class="section">
                <h3>案件基础信息</h3>
                <p><strong>案件编号：</strong> {{ case_result.case_id }}</p>
                <p><strong>处理耗时：</strong> {{ case_result.elapsed_ms }} 毫秒</p>
                <p><strong>深度伪造检测：</strong>
                    <span :class="case_result.deepfake_detected ? 'text-red' : 'text-green'">
                        {{ case_result.deepfake_detected ? '检测到深伪' : '未检测到深伪' }}
                    </span>
                </p>
            </div>

            <!-- 2. 诈骗预警列表 (alerts 数组) -->
            <div class="section" v-if="case_result.alerts && case_result.alerts.length > 0">
                <h3>安全预警</h3>
                <div v-for="(alert, index) in case_result.alerts" :key="index" class="alert-box">
                    <p><strong>预警类型：</strong> {{ alert.title }} (级别: {{ alert.level }})</p>
                    <p><strong>预警原因：</strong> {{ alert.reason }}</p>
                    <p class="warning-text"><strong> 警告建议：</strong> {{ alert.warning }}</p>
                </div>
            </div>

            <!-- 3. 深度研判结果 (judgment 对象) -->
            <div class="section" v-if="case_result.judgment">
                <h3>智能研判分析</h3>

                <div class="judgment-summary">
                    <p><strong>诈骗类型：</strong> {{ case_result.judgment.fraud_type || '未识别' }}</p>
                    <p><strong>置信度：</strong> {{ case_result.judgment.confidence }} (得分: {{
                        case_result.judgment.confidence_score }})</p>
                    <p><strong>是否属于诈骗：</strong>
                        <span :style="{ color: case_result.judgment.is_fraud ? '#ff4d4f' : '#52c41a' }">
                            {{ case_result.judgment.is_fraud ? '是' : '否' }}
                        </span>
                    </p>
                    <p><strong>分析理由：</strong> {{ case_result.judgment.reason }}</p>
                    <p class="warning-text"><strong>防骗提醒：</strong> {{ case_result.judgment.warning }}</p>
                </div>

                <!-- 4. 相似案例列表 (judgment.similar_cases 数组) -->
                <div class="similar-cases"
                    v-if="case_result.judgment.similar_cases && case_result.judgment.similar_cases.length > 0">
                    <h4>相似历史案例参考</h4>
                    <div v-for="(caseItem, idx) in case_result.judgment.similar_cases" :key="idx" class="case-item">
                        <p><strong>案件类型：</strong> {{ caseItem.fraud_type }}</p>
                        <p><strong>匹配得分：</strong> {{ caseItem.score }}</p>
                        <p class="case-content">案情描述：{{ caseItem.content }}</p>
                    </div>
                </div>
            </div>

            <!-- 5. 各阶段处理耗时 (stages 对象) -->
            <div class="section">
                <h3>处理耗时明细</h3>
                <ul class="timing-list">
                    <li>多模态分析：{{ case_result.stages.multimodal_ms }}ms</li>
                    <li>特征提取：{{ case_result.stages.extraction_ms }}ms</li>
                    <li>数据存储：{{ case_result.stages.storage_ms }}ms</li>
                    <li>智能研判：{{ case_result.stages.judgment_ms }}ms</li>
                    <li><strong>总耗时：{{ case_result.stages.total_ms }}ms</strong></li>
                </ul>
            </div>

        </div>
    </div>
    <div id="result_area">

    </div>

</template>

<style scoped>
.analyse {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    display: flex;
    border: 2px solid darkcyan;
    border-radius: 3px;
    padding: 10px;
    gap: 10px;
}

.encode {
    border: 1px solid darkcyan;
    border-radius: 3px;
    gap: 12px
}

textarea {
    width: 80%;
    min-height: 60px;
    /* 起始高度 */
    max-height: 200px;
    /* 临界高度 */
    overflow-y: auto;
    /* 超出后显示滚动条 */
    resize: vertical;
    /* 可选，允许用户手动拖动 */
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
}

.encode {
    flex: 1;
    /* 撑满父容器的剩余垂直空间 */
    overflow-y: auto;
    /* 超出高度时显示纵向滚动条 */
    border: 1px solid darkcyan;
    border-radius: 3px;
    padding: 8px;
    /* 内部文字与边框留空（可选） */
}
.result-container {
  margin-top: 20px;
  width: 100%;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}
.data-card {
  text-align: left;
}
.section {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}
.alert-box {
  background: #fff3cd;
  border: 1px solid #ffe69c;
  border-radius: 6px;
  padding: 10px 15px;
  margin-bottom: 10px;
}
.warning-text {
  color: #d93025;
  font-weight: bold;
}
.case-item {
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 10px 15px;
  margin-bottom: 10px;
}
.case-content {
  font-size: 14px;
  color: #555;
  background: #f1f3f5;
  padding: 8px;
  border-radius: 4px;
}
.timing-list li {
  list-style: none;
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
}
.text-red { color: #d93025; font-weight: bold; }
.text-green { color: #188038; font-weight: bold; }
</style>