// ==UserScript==
// @name         什么？我懂个屁的心理学！
// @namespace    http://tampermonkey.net/
// @version      4.6
// @description  今天这场我就是心理学带师！
// @author       Anonymous
// @match        http://psy.gdut.edu.cn/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // --- 解决脚本重复执行问题的“哨兵” ---
    if (window.psyScriptLoaded) {
        console.log("[监控] 脚本已加载，阻止重复执行。");
        return;
    }
    window.psyScriptLoaded = true;

    // 配置参数
    const TARGET_CLASS = "testMain_body_item";
    const CONTAINER_CLASS = "testMain_body";
    const HIGHLIGHT_COLOR = "#e4ffec4f";
    const BUTTON_ID = "psy-master-toggle";

    // 状态与引用变量
    let isActivated = false;
    let observer = null;
    let containerObserver = null;
    let targetDocument = null; // 用于存储iframe的document对象

    /**
     * 获取嵌套iframe中的document对象
     * @returns {Document | null} 目标iframe的document对象，如果找不到则返回null
     */
    const getTargetDocument = () => {
        try {
            const iframe1 = document.querySelector('#iframe1');
            if (!iframe1 || !iframe1.contentDocument) return null;

            const iframe2 = iframe1.contentDocument.querySelector('#prevent_iframeSubView');
            if (!iframe2 || !iframe2.contentDocument) return null;

            return iframe2.contentDocument; // 成功获取最内层iframe的document
        } catch (e) {
            console.error("[监控] 访问iframe时出错，可能是跨域或加载问题:", e);
            return null;
        }
    };

    // 激活/关闭流程
    const toggleActivation = (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (isActivated) {
            deactivateMonitoring();
        } else {
            // 激活时，启动等待和监控流程
            waitForIframeAndActivate();
        }
    };

    // 等待Iframe加载并激活监控
    const waitForIframeAndActivate = () => {
        targetDocument = getTargetDocument();
        if (targetDocument) {
            console.log("[监控] 目标Iframe已找到，系统激活！");
            isActivated = true;
            initMonitoring(targetDocument); // 传入iframe的document
            // [优化] 移除alert弹窗，改为无干扰的控制台日志
            console.log("现在你就是心理学带师！再次点击按钮可关闭。");
            updateButtonState();
        } else {
            console.log("[监控] 正在等待Iframe加载...");
            // 如果没找到，0.5秒后重试
            setTimeout(waitForIframeAndActivate, 500);
        }
    };

    // 高亮相关函数
    const highlightCorrectAnswer = (element) => {
        const correctInput = element.querySelector('input[choicescore="1"]');
        if (!correctInput) return;
        const liElement = correctInput.closest("li");
        if (liElement) {
            liElement.style.backgroundColor = HIGHLIGHT_COLOR;
            liElement.dataset.psyHighlight = "true";
        }
    };

    const clearHighlights = (doc) => {
        if (!doc) return;
        doc.querySelectorAll(`[data-psy-highlight="true"]`).forEach((el) => {
            el.style.backgroundColor = "";
            delete el.dataset.psyHighlight;
        });
    };

    // 监控系统
    const initMonitoring = (doc) => {
        const initialItems = doc.querySelectorAll(`.${TARGET_CLASS}`);
        console.log(`[监控] 初始化：在Iframe中发现 ${initialItems.length} 个题目项`);
        initialItems.forEach(highlightCorrectAnswer);

        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList.contains(TARGET_CLASS)) {
                            highlightCorrectAnswer(node);
                        }
                        node.querySelectorAll(`.${TARGET_CLASS}`).forEach(highlightCorrectAnswer);
                    }
                });
            });
        });
        // 在iframe的body上进行观察
        observer.observe(doc.body, {
            childList: true,
            subtree: true,
        });

        const initContainerObserver = () => {
            const container = doc.querySelector(`.${CONTAINER_CLASS}`);
            if (container) {
                containerObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains(TARGET_CLASS)) {
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
        if (!isActivated) return;
        if (observer) observer.disconnect();
        if (containerObserver) containerObserver.disconnect();

        clearHighlights(targetDocument); // 使用存储的iframe document对象

        isActivated = false;
        targetDocument = null; // 重置
        console.log("[监控] 系统已关闭");
        updateButtonState();
    };

    // 更新按钮状态和文本
    const updateButtonState = () => {
        const button = document.getElementById(BUTTON_ID);
        if (button) {
            if (isActivated) {
                button.innerHTML = '<i class="fa fa-graduation-cap"></i>';
                button.style.color = "#d7ffb4";
            } else {
                button.innerHTML = '<i class="fa fa-graduation-cap"></i>';
                button.style.color = "";
            }
        }
    };

    // 创建并插入激活按钮
    const createActivationButton = () => {
        if (document.getElementById(BUTTON_ID)) return;

        const targetElement = document.getElementById("iuserInfo");
        if (targetElement) {
            const parentLi = targetElement.parentElement;
            const newLi = document.createElement("li");
            newLi.className = "frameTop-fun-light-blue";

            const newLink = document.createElement("a");
            newLink.href = "javascript:void(0)";
            newLink.id = BUTTON_ID;
            newLink.style.cursor = "pointer";
            newLink.innerHTML = '<i class="fa fa-graduation-cap"></i>';
            newLink.addEventListener("click", toggleActivation);

            newLi.appendChild(newLink);
            parentLi.parentElement.insertBefore(newLi, parentLi);
            console.log("[监控] 激活按钮已创建");
        } else {
            setTimeout(createActivationButton, 500);
        }
    };

    // 启动脚本
    (function init() {
        createActivationButton();
        console.log("[监控] 脚本初始化完成，请点击'我是带师'按钮激活");
    })();
})();
