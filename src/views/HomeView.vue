<script lang="ts">
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
            selectedFile: [] as Array<{ type: string; content: string }>
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
        submit() {
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

            axios.post('127.0.0.1:8000/analyze', payload)
                .then(res => {
                    console.log('succ', res.data);
                })
                .catch(err => {
                    console.error('fail', err);
                })
            
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
        <input type="file" accept="image/*,video/*,audio/*,.txt" @change="handleFileChange" ref="fileInput" multiple />

        <div>
            <p>您也可以手动输入文本信息:</p>
            <textarea v-model="temp_text" ref="textAreaRef" placeholder="请输入..."></textarea>
            <button @click="submit_text">提交</button>
        </div>
        <div class="encode">
            <div style="display: flex;flex-direction: row;gap:10px" v-for="(item, index) in selectedFile" :key="index">
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
</style>