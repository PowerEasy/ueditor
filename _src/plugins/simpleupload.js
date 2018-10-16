/**
 * @description
 * 简单上传:点击按钮,直接选择文件上传
 * @author Jinqn
 * @date 2014-03-31
 */
UE.plugin.register('simpleupload', function () {
    var me = this,
        isLoaded = false,
        containerBtn;

    function initUploadBtn() {
        var w = containerBtn.offsetWidth || 20,
            h = containerBtn.offsetHeight || 20,
            btnIframe = document.createElement('iframe'),
            btnStyle = 'display:block;width:' + w + 'px;height:' + h + 'px;overflow:hidden;border:0;margin:0;padding:0;position:absolute;top:0;left:0;filter:alpha(opacity=0);-moz-opacity:0;-khtml-opacity: 0;opacity: 0;cursor:pointer;';

        domUtils.on(btnIframe, 'load', function () {

            var timestrap = (+new Date()).toString(36),
                wrapper,
                btnIframeDoc,
                btnIframeBody,
                requestToken;

            btnIframeDoc = (btnIframe.contentDocument || btnIframe.contentWindow.document);
            btnIframeBody = btnIframeDoc.body;
            wrapper = btnIframeDoc.createElement('div');
            //[2018-08-22 尹磊] 单图上传添加__RequestVerificationToken，预防CSRF攻击。
            var $__RequestVerificationToken = $('input[name="__RequestVerificationToken"]');
            requestToken = $__RequestVerificationToken.length ? $__RequestVerificationToken.val() : '';

            wrapper.innerHTML = '<form id="edui_form_' + timestrap + '" target="edui_iframe_' + timestrap + '" method="POST" enctype="multipart/form-data" action="' + me.getOpt('serverUrl') + '" ' +
                'style="' + btnStyle + '">' +
                '<input id="edui_input_' + timestrap + '" type="file" accept="image/gif,image/jpeg,image/png,image/jpg,image/bmp" name="' + me.options.imageFieldName + '" ' +
                'style="' + btnStyle + '">' +
                '<input type="hidden" name="__RequestVerificationToken" value="' + requestToken + '">' +
                '</form>' +
                '<iframe id="edui_iframe_' + timestrap + '" name="edui_iframe_' + timestrap + '" style="display:none;width:0;height:0;border:0;margin:0;padding:0;position:absolute;"></iframe>';

            wrapper.className = 'edui-' + me.options.theme;
            wrapper.id = me.ui.id + '_iframeupload';
            btnIframeBody.style.cssText = btnStyle;
            btnIframeBody.style.width = w + 'px';
            btnIframeBody.style.height = h + 'px';
            btnIframeBody.appendChild(wrapper);

            if (btnIframeBody.parentNode) {
                btnIframeBody.parentNode.style.width = w + 'px';
                btnIframeBody.parentNode.style.height = w + 'px';
            }

            var form = btnIframeDoc.getElementById('edui_form_' + timestrap);
            var input = btnIframeDoc.getElementById('edui_input_' + timestrap);
            var iframe = btnIframeDoc.getElementById('edui_iframe_' + timestrap);

            domUtils.on(input, 'change', function () {
                if (!input.value) return;
                
                /* 判断后端配置是否没有加载成功 */
                if (!me.getOpt('imageActionName')) {
                    alert(me.getLang('autoupload.errorLoadConfig'));
                    return;
                }

                var filename = input.value,
                    fileext = filename ? filename.substr(filename.lastIndexOf('.')) : '',
                    allowFiles = me.getOpt('imageAllowFiles'),
                    fileSize = input.files[0].size,
                    maxSize = me.getOpt('imageMaxSize');

                if (!fileext || (allowFiles && (allowFiles.join('') + '.').indexOf(fileext.toLowerCase() + '.') == -1)) {
                    alert(me.getLang('simpleupload.exceedTypeError') + '，请上传' + allowFiles + '的文件。');
                    return;
                }

                if (fileSize > maxSize) {
                    alert(me.getLang('simpleupload.exceedSizeError') + '，请上传' + maxSize/1024/1024 + 'M以内的文件。');
                    return;
                }

                var loadingId = 'loading_' + (+new Date()).toString(36);
                var params = utils.serializeParam(me.queryCommandValue('serverparam')) || '';

                var imageActionUrl = me.getActionUrl(me.getOpt('imageActionName'));
                
                me.focus();
                me.execCommand('inserthtml', '<img class="loadingclass" id="' + loadingId + '" src="' + me.options.themePath + me.options.theme + '/images/spacer.gif">');

                function callback() {
                    try {
                        var link, json, loader,
                            body = (iframe.contentDocument || iframe.contentWindow.document).body,
                            result = body.innerText || body.textContent || '';
                        json = (new Function("return " + result))();
                        if (json.url.indexOf('/Content') === 0) {
                            link = json.url;
                        } else {
                            link = me.options.imageUrlPrefix + json.url;
                        }

                        if (json.state == 'SUCCESS' && json.url) {
                            loader = me.document.getElementById(loadingId);
                            domUtils.removeClasses(loader, 'loadingclass');
                            loader.setAttribute('src', link);
                            loader.setAttribute('_src', link);
                            loader.setAttribute('alt', json.original || '');
                            loader.removeAttribute('id');
                        } else {
                            showErrorLoader && showErrorLoader(json.state);
                        }
                    } catch (er) {
                        showErrorLoader && showErrorLoader(me.getLang('simpleupload.loadError'));
                    }
                    form.reset();
                    domUtils.un(iframe, 'load', callback);
                }

                function showErrorLoader(title) {
                    if (loadingId) {
                        var loader = me.document.getElementById(loadingId);
                        loader && domUtils.remove(loader);
                        me.fireEvent('showmessage', {
                            'id': loadingId,
                            'content': title,
                            'type': 'error',
                            'timeout': 4000
                        });
                    }
                }
                
                domUtils.on(iframe, 'load', callback);
                form.action = utils.formatUrl(imageActionUrl + (imageActionUrl.indexOf('?') == -1 ? '?' : '&') + params);
                form.submit();
            });

            var stateTimer;
            me.addListener('selectionchange', function () {
                clearTimeout(stateTimer);
                stateTimer = setTimeout(function () {
                    var state = me.queryCommandState('simpleupload');
                    if (state == -1) {
                        input.disabled = 'disabled';
                    } else {
                        input.disabled = false;
                    }
                }, 400);
            });
            isLoaded = true;
        });

        btnIframe.style.cssText = btnStyle;
        containerBtn.appendChild(btnIframe);
    }

    return {
        bindEvents: {
            'ready': function () {
                //设置loading的样式
                utils.cssRule('loading',
                    '.loadingclass{display:inline-block;cursor:default;background: url(\'' +
                    this.options.themePath +
                    this.options.theme + '/images/loading.gif\') no-repeat center center transparent;border:1px solid #cccccc;margin-right:1px;height: 22px;width: 22px;}\n' +
                    '.loaderrorclass{display:inline-block;cursor:default;background: url(\'' +
                    this.options.themePath +
                    this.options.theme + '/images/loaderror.png\') no-repeat center center transparent;border:1px solid #cccccc;margin-right:1px;height: 22px;width: 22px;' +
                    '}',
                    this.document);
            },
            /* 初始化简单上传按钮 */
            'simpleuploadbtnready': function (type, container) {
                containerBtn = container;
                me.afterConfigReady(initUploadBtn);
            }
        },
        outputRule: function (root) {
            utils.each(root.getNodesByTagName('img'), function (n) {
                if (/\b(loaderrorclass)|(bloaderrorclass)\b/.test(n.getAttr('class'))) {
                    n.parentNode.removeChild(n);
                }
            });
        },
        commands: {
            'simpleupload': {
                queryCommandState: function () {
                    return isLoaded ? 0 : -1;
                }
            }
        }
    }
});
