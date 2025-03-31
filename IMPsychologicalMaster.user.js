// ==UserScript==
// @name         什么？我懂个屁的心理学！
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  今天这场我就是心理学带师！
// @author       Anonymous
// @match        http://psy.gdut.edu.cn/*
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // 配置参数
    const TARGET_CLASS = "testMain_body_item";
    const CONTAINER_CLASS = "testMain_body";
    const HIGHLIGHT_COLOR = "#e4ffec4f";
    const COMBO_SEQUENCE = ["KeyP", "KeyS", "KeyY"]; // 激活组合键
    const COMBO_TIMEOUT = 2000; // 2秒超时
    const CUSTOM_B64 =
        "lbzLX6PD4UqcgAm1psTZVh8vxOFi3eWjSu5wH9kM02BJGNadfIr/CKER+nyt7YQo";
    const XOR_KEY = 0x1d4a3e07a2n; // 1145141919810的十六进制
    const STORED_HASH = "f4574b244738362fc7575638"; // PhyMaster
    const CHECK_TIME = false; // 是否检查时间
    const ACTIVATE_DATE = [2000, 1, 1]; // 激活日期
    const ACTIVATE_TIME_RANGE = [
        // 允许使用的时间范围
        [0, 30],
        [23, 30],
    ];
    const CHECK_USER = true; // 是否检查用户
    const USERS = [
        // 允许使用的用户列表
    ];

    // 状态变量
    let isActivated = false;
    let observer = null;
    let containerObserver = null;
    let comboStep = 0;
    let comboTimeout = null;
    let lastKeyTime = 0;
    let verifyUser = false;

    const checkDateTime = () => {
        const now = new Date();

        // 验证年份
        if (now.getFullYear() !== ACTIVATE_DATE[0]) return false;

        // 验证月份（注意JS的Date月份从0开始，所以需要+1比较）
        if (now.getMonth() + 1 !== ACTIVATE_DATE[1]) return false;

        // 验证日期
        if (now.getDate() !== ACTIVATE_DATE[2]) return false;

        // 验证时间范围
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        // 转换为分钟数比较
        const startMinutes =
            ACTIVATE_TIME_RANGE[0][0] * 60 + ACTIVATE_TIME_RANGE[0][1];
        const endMinutes =
            ACTIVATE_TIME_RANGE[1][0] * 60 + ACTIVATE_TIME_RANGE[1][1];
        const currentTotal = currentHours * 60 + currentMinutes;

        return currentTotal >= startMinutes && currentTotal <= endMinutes;
    };
    // 加密函数
    const customEncrypt = (password) => {
        // UTF-8编码修复
        const encoder = new TextEncoder();
        const utf8Bytes = encoder.encode(password);
        const utf8Str = String.fromCharCode(...utf8Bytes);

        // Base64编码修复
        const stdB64 = btoa(utf8Str)
            .replace(/=+$/, "")
            .replace(/\//g, "_")
            .replace(/\+/g, "-");

        // 自定义字典转换
        const customEncoded = stdB64.replace(/[A-Za-z0-9\-_]/g, (m) =>
            CUSTOM_B64.charAt(
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(
                    m
                )
            )
        );

        // 异或加密修复
        const keyBytes = new Uint8Array(8);
        new DataView(keyBytes.buffer).setBigUint64(0, XOR_KEY, true);

        return Array.from(customEncoded)
            .map((char, index) => {
                const keyByte = keyBytes[index % 8];
                return (char.charCodeAt(0) ^ keyByte).toString(16).padStart(2, "0");
            })
            .join("")
            .toLowerCase(); // 统一小写
    };

    // 组合键激活检测
    const handleComboActivation = (e) => {
        const now = Date.now();

        // 超时重置
        if (now - lastKeyTime > COMBO_TIMEOUT) {
            comboStep = 0;
            console.debug("[监控] 组合键超时重置");
        }

        // 验证按键顺序
        if (e.code === COMBO_SEQUENCE[comboStep] && !e.repeat) {
            e.preventDefault();
            lastKeyTime = now;
            comboStep++;

            // 完成组合键
            if (comboStep === COMBO_SEQUENCE.length) {
                console.log("[监控] 组合键验证通过");
                triggerActivation();
                comboStep = 0;
                return;
            }

            // 设置重置计时器
            clearTimeout(comboTimeout);
            comboTimeout = setTimeout(() => {
                console.debug("[监控] 组合键输入中断");
                comboStep = 0;
            }, COMBO_TIMEOUT);
        }
        // 错误按键处理
        else if (COMBO_SEQUENCE.includes(e.code)) {
            console.debug("[监控] 按键顺序错误");
            comboStep = 0;
            clearTimeout(comboTimeout);
        }
    };

    // 独立P键关闭检测
    const handlePKeyDeactivation = (e) => {
        if (
            e.code === "KeyP" &&
            !e.ctrlKey &&
            !e.shiftKey &&
            !e.altKey &&
            !e.metaKey &&
            !e.repeat
        ) {
            e.preventDefault();

            if (isActivated) {
                console.log("[监控] 收到关闭指令");
                deactivateMonitoring();
            }
        }
    };

    // 激活流程
    const triggerActivation = () => {
        if (isActivated) return;
        // 优先验证日期时间
        if (CHECK_TIME) {
            if (!checkDateTime()) {
                console.warn("[安全] 非激活时段访问被拒绝");
                console.warn(
                    `⚠️ 该功能只能在 ${ACTIVATE_DATE[0]}年${String(ACTIVATE_DATE[1]).padStart(2,'0')}月${String(ACTIVATE_DATE[2]).padStart(2,'0')}日 ` +
                    `${String(ACTIVATE_TIME_RANGE[0][0]).padStart(2,'0')}:${String(ACTIVATE_TIME_RANGE[0][1]).padStart(2,'0')} ~ ` +
                    `${String(ACTIVATE_TIME_RANGE[1][0]).padStart(2,'0')}:${String(ACTIVATE_TIME_RANGE[1][1]).padStart(2,'0')} 期间使用`
                );
                return;
            }
        }
        // 验证用户身份
        if (CHECK_USER && !verifyUser) {
            console.warn("[安全] 非授权用户访问被拒绝");
            return;
        }
        const password = prompt("🔒 你知道这里要输入什么东西的");
        if (password && customEncrypt(password) === STORED_HASH) {
            isActivated = true;
            initMonitoring();
            console.log("[监控] 系统已激活");
            alert("现在你就是心理学带师！不要声张也不要告诉别人，完事后按下 P 关掉");
        } else {
            console.warn(`[监控] 加密后的访问凭证: ${customEncrypt(password)}`);
            console.warn("[监控] 无效的访问凭证");
        }
    };

    // 高亮相关函数
    const highlightCorrectAnswer = (element) => {
        const correctInput = element.querySelector('input[choicescore="1"]');
        if (!correctInput) return;
        const liElement = correctInput.closest("li");
        if (liElement) {
            liElement.style.backgroundColor = HIGHLIGHT_COLOR;
            liElement.dataset.psyHighlight = "true"; // 标记高亮元素
        }
    };

    const clearHighlights = () => {
        document.querySelectorAll(`[data-psy-highlight="true"]`).forEach((el) => {
            el.style.backgroundColor = "";
            delete el.dataset.psyHighlight;
        });
    };

    // 监控系统
    const initMonitoring = () => {
        // 初始化高亮
        document
            .querySelectorAll(`.${TARGET_CLASS}`)
            .forEach(highlightCorrectAnswer);

        // 主DOM监听
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList.contains(TARGET_CLASS)) {
                            highlightCorrectAnswer(node);
                        }
                        node
                            .querySelectorAll(`.${TARGET_CLASS}`)
                            .forEach(highlightCorrectAnswer);
                    }
                });
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false,
        });

        // 容器监听
        const initContainerObserver = () => {
            const container = document.querySelector(`.${CONTAINER_CLASS}`);
            if (container) {
                containerObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (
                                node.nodeType === Node.ELEMENT_NODE &&
                                node.classList.contains(TARGET_CLASS)
                            ) {
                                highlightCorrectAnswer(node);
                            }
                        });
                    });
                });
                containerObserver.observe(container, {
                    childList: true,
                    subtree: true,
                });
                console.debug("[监控] 容器监听器已启动");
            } else {
                setTimeout(initContainerObserver, 500);
            }
        };
        initContainerObserver();
    };

    // 关闭系统
    const deactivateMonitoring = () => {
        if (observer) {
            observer.disconnect();
            console.debug("[监控] 主观察器已停止");
        }
        if (containerObserver) {
            containerObserver.disconnect();
            console.debug("[监控] 容器观察器已停止");
        }
        clearHighlights();
        isActivated = false;
        console.log("[监控] 系统已关闭");
    };

    // 事件监听初始化
    const initEventListeners = () => {
        document.addEventListener("keydown", handleComboActivation);
        document.addEventListener("keydown", handlePKeyDeactivation);
        console.log("[监控] 事件监听器已就绪");
    };

    const fetchName = () => {
        fetch("http://psy.gdut.edu.cn/plug/plug_user_userInfo.do")
            .then((res) => res.json())
            .then((data) => {
                // 处理数据
                if (data && data.user && USERS.includes(data.user.userName)) {
                    // 用户身份验证通过
                    console.log("[监控] 用户身份验证通过！");
                    verifyUser = true;
                } else {
                    console.warn(`[监控] 用户 ${data.user.userName} 未获准使用本程序！`);
                }
            })
            .catch((error) => {
                console.error("[监控] 用户身份验证失败！", error);
            });
    };

    // 启动脚本
    (function init() {
        initEventListeners();
        if (CHECK_USER) {
            fetchName();
        }
        console.log("[监控] 脚本初始化完成");
    })();
})();
