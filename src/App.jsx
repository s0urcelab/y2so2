import { useEffect, useRef, useState } from 'react'
import browser from 'webextension-polyfill'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import {
    Avatar,
    AvatarImage,
} from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import UploadIcon from '@/components/ui/upload-icon'
import { Spinner } from '@/components/ui/spinner'
import { toast } from "sonner"

import './App.css'

const UPLOAD_API_PREFIX = `https://${import.meta.env.VITE_UPLOAD_API_PREFIX}`
const UPLOAD_API_TOKEN = import.meta.env.VITE_UPLOAD_API_TOKEN

function App() {
    const { setTheme } = useTheme()
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setUrl] = useState('')
    const [inputImageUrl, setInputImageUrl] = useState('')
    const [selectedEngines, setSelectedEngines] = useState([])
    const hasLoadedRef = useRef(false)

    useEffect(() => {
        setTheme('system')
        
        // 从 storage 恢复上次选择的引擎
        browser.storage.local.get('selectedEngines')
            .then(({ selectedEngines }) => {
                if (Array.isArray(selectedEngines)) {
                    setSelectedEngines(selectedEngines)
                }
            })
            .finally(() => {
                hasLoadedRef.current = true
            })
    }, [])

    useEffect(() => {
        document.addEventListener('paste', handlePaste)
        return () => {
            document.removeEventListener('paste', handlePaste)
        }
    }, [selectedEngines])

    /**
     * 监听引擎选择变化并持久化
     */
    useEffect(() => {
        if (!hasLoadedRef.current) return
        browser.storage.local.set({ selectedEngines })
    }, [selectedEngines])

    /**
     * 将图片文件上传并触发背景页搜索
     * @param {File} file - 要上传的图片文件
     */
    const uploadAndSearch = async (file) => {
        if (!file) return

        const objectUrl = URL.createObjectURL(file)
        setUrl(objectUrl)
        setUploading(true)

        try {
            const formData = new FormData()
            const fileName = file?.name || 'upload.png'
            formData.append('file', file, fileName)
            formData.append('expires_in', 300)

            const res = await fetch(`${UPLOAD_API_PREFIX}/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Upload-Auth': UPLOAD_API_TOKEN,
                },
            })

            const response = await res.json()
            const imgUrl = `${UPLOAD_API_PREFIX}${response?.data?.url}`
            
            await browser.runtime.sendMessage({
                type: 'searchByImageUrl',
                imageUrl: imgUrl,
                engines: Array.isArray(selectedEngines) && selectedEngines.length > 0 ? selectedEngines : undefined,
            })
        } catch (err) {
            toast.error(`上传失败: ${err}`, {
                duration: 3000,
                position: 'top-center',
            })
        } finally {
            URL.revokeObjectURL(objectUrl)
            setUrl('')
            setUploading(false)
        }
    }

    /**
     * 处理文件选择并上传
     * @param {React.ChangeEvent<HTMLInputElement>} e - 文件选择事件
     */
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await uploadAndSearch(file)
        // 重置 input 以便再次选择同一文件
        e.target.value = ''
    }

    /**
     * 处理粘贴事件：
     * - 如剪贴板含有图片文件，直接上传
     * - 如为图片链接文本，跳过上传，直接搜索
     * @param {React.ClipboardEvent} e - 粘贴事件
     */
    const handlePaste = async (e) => {
        // 优先取文件
        const files = e.clipboardData?.files
        if (files && files.length > 0) {
            const imageFile = Array.from(files).find((f) => f.type?.startsWith('image/'))
            if (imageFile) {
                e.preventDefault()
                await uploadAndSearch(imageFile)
                return
            }
        }

    }

    /**
     * 判断引擎是否被选中
     * @param {string} key - 引擎 key，例如 'google'
     * @returns {boolean}
     */
    const isEngineSelected = (key) => selectedEngines.includes(key)

    /**
     * 切换引擎选中状态
     * @param {string} key - 引擎 key
     * @param {boolean} pressed - 目标按下状态
     */
    const toggleEngine = (key, pressed) => {
        setSelectedEngines((prev) => {
            const set = new Set(prev)
            if (pressed) set.add(key); else set.delete(key)
            return Array.from(set)
        })
    }

    /**
     * 处理基于图片链接的搜索
     * @param {import('react').FormEvent} e - 表单提交事件
     */
    const handleSearchByUrl = async (e) => {
        e?.preventDefault?.()
        const url = inputImageUrl?.trim()
        if (!url) return
        setUploading(true)
        try {
            await browser.runtime.sendMessage({
                type: 'searchByImageUrl',
                imageUrl: url,
                engines: Array.isArray(selectedEngines) && selectedEngines.length > 0 ? selectedEngines : undefined,
            })
        } catch (err) {
            toast.error(`搜索失败: ${err}`, {
                duration: 3000,
                position: 'top-center',
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="w-md flex-col justify-center p-6">
            <header className="flex justify-center items-center">
                <img className="w-12 mr-2" src="/assets/icon128.png" alt="" />
                <span className="font-bold text-3xl">Y2SO2 以图搜图</span>
            </header>

            <div className="text-lg dark:text-gray-400 text-center mt-4 mb-10">选择搜索引擎开始搜索（支持多选）</div>


            <div className="grid grid-cols-3 grid-rows-2 gap-2 justify-items-stretch">
                <Toggle pressed={isEngineSelected('google')} onPressedChange={(p) => toggleEngine('google', p)} className="pl-4 pr-4">
                    <Avatar>
                        <AvatarImage src="/assets/google.svg" alt="Google" />
                    </Avatar>
                    <h2 className="font-bold">Google</h2>

                </Toggle>

                <Toggle pressed={isEngineSelected('yandex')} onPressedChange={(p) => toggleEngine('yandex', p)} className="pl-4 pr-4">
                    <Avatar>
                        <AvatarImage src="/assets/yandex.svg" alt="Yandex" />
                    </Avatar>
                    <h2 className="font-bold">Yandex</h2>

                </Toggle>
                <Toggle pressed={isEngineSelected('bing')} onPressedChange={(p) => toggleEngine('bing', p)} className="pl-4 pr-4">
                    <Avatar>
                        <AvatarImage src="/assets/bing.svg" alt="Bing" />
                    </Avatar>
                    <h2 className="font-bold">Bing</h2>

                </Toggle>


                <Toggle pressed={isEngineSelected('saucenao')} onPressedChange={(p) => toggleEngine('saucenao', p)} className="pl-4 pr-4">
                    <Avatar>
                        <AvatarImage src="/assets/sn.png" alt="SauceNAO" />
                    </Avatar>
                    <h2 className="font-bold">SauceNAO</h2>
                </Toggle>
                <Toggle pressed={isEngineSelected('tracemoe')} onPressedChange={(p) => toggleEngine('tracemoe', p)} className="pl-4 pr-4">
                    <Avatar>
                        <AvatarImage src="/assets/trace.png" alt="trace.moe" />
                    </Avatar>
                    <h2 className="font-bold">trace.moe</h2>

                </Toggle>
            </div>

            <label
                className="upload-box transition-colors flex flex-col items-center gap-2 border-dashed border-2 p-4 mt-4 mb-4 rounded-xl hover:border-(--ring) cursor-pointer"
                htmlFor="upload"
                aria-label="将图片粘贴到此处或点击上传"
            >
                {
                    uploading
                        ? (
                            <Spinner className="absolute z-1" show={uploading}>
                                <img src={previewUrl} className="blur-xs" alt="upload-image" />
                            </Spinner>
                        )
                        : (
                            <>
                                <UploadIcon className="w-16 fill-(--primary)" />
                                <div className="text-center text-sm">
                                    将图片粘贴到此处或 <a href="#" className="underline underline-offset-4">上传</a>
                                </div>
                                <Input id="upload" type="file" className="hidden" onChange={handleFileChange} />
                            </>
                        )
                }
            </label>

            <form className="flex items-center gap-2" onSubmit={handleSearchByUrl}>
                <Input
                    disabled={uploading}
                    placeholder="输入图片链接"
                    value={inputImageUrl}
                    onChange={(e) => setInputImageUrl(e.target.value)}
                />
                <Button disabled={uploading || !inputImageUrl.trim()} type="submit">
                    搜索
                </Button>
            </form>
        </div>
    )
}

export default App
