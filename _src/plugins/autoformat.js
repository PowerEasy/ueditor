/* global browser */
/* global domUtils */
/**
 * 自动排版。
 * @file
 */

/**
 * 内容自动排版。
 * ```javascript
 * editor.execCommand( 'removeformat', 'strong','color','width' );
 * ```
 */

UE.plugins['autoformat'] = function () {
    var me = this;
    me.setOpt({
        'autoFormatTags': 'b,big,code,del,dfn,em,font,i,ins,kbd,q,samp,small,span,strike,strong,sub,sup,tt,u,var',
        'autoFormatAttributes': 'class,style,lang,width,height,hspace,valign',
        'autoFormatSavedStyles': 'text-indent'
    });
    me.commands['autoformat'] = {
        execCommand: function (cmdName, tags, style, attrs, notIncludeA) {

            var tagReg = new RegExp('^(?:' + (tags || this.options.autoFormatTags).replace(/,/g, '|') + ')$', 'i'),
                autoFormatAttributes = style ? [] : (attrs || this.options.autoFormatAttributes).split(','),
                savedStyles = this.options.autoFormatSavedStyles.split(','),
                range = new dom.Range(this.document),
                bookmark, node, parent,
                filter = function (node) {
                    return node.nodeType == 1;
                };

            function isRedundantSpan(node) {
                if (node.nodeType == 3 || node.tagName.toLowerCase() != 'span') {
                    return 0;
                }
                if (browser.ie) {
                    //ie 下判断实效，所以只能简单用style来判断
                    //return node.style.cssText == '' ? 1 : 0;
                    var attrs = node.attributes;
                    if (attrs.length) {
                        for (var i = 0, l = attrs.length; i < l; i++) {
                            if (attrs[i].specified) {
                                return 0;
                            }
                        }
                        return 1;
                    }
                }
                return !node.attributes.length;
            }
            /**
             * 输出要保留的样式
             * @param  {Node} node 节点
             * @param  {array} savedStyles 要保留的样式，不被清理掉。
             */
            function outputSytles(node,savedStyles) {
                var styles,
                    outputStyles = [];
                if (node.attributes && node.attributes.length > 0 && node.attributes['style']) {
                    styles = node.attributes['style'].value.split(';');
                    for (var index = 0; index < styles.length; index++) {
                        var key = styles[index];
                        if (key.split(':')[0] in savedStyles) {
                            continue;
                        } else {
                            outputStyles.push(key);
                        }


                    }

                }
                
                return outputStyles;
            }

            function doRemove(range) {

                var bookmark1 = range.createBookmark();
                if (range.collapsed) {
                    range.enlarge(true);
                }

                //不能把a标签切了
                if (!notIncludeA) {
                    var aNode = domUtils.findParentByTagName(range.startContainer, 'a', true);
                    if (aNode) {
                        range.setStartBefore(aNode);
                    }

                    aNode = domUtils.findParentByTagName(range.endContainer, 'a', true);
                    if (aNode) {
                        range.setEndAfter(aNode);
                    }

                }


                bookmark = range.createBookmark();

                node = bookmark.start;

                //切开始
                while ((parent = node.parentNode) && !domUtils.isBlockElm(parent)) {
                    domUtils.breakParent(node, parent);

                    domUtils.clearEmptySibling(node);
                }
                if (bookmark.end) {
                    //切结束
                    node = bookmark.end;
                    while ((parent = node.parentNode) && !domUtils.isBlockElm(parent)) {
                        domUtils.breakParent(node, parent);
                        domUtils.clearEmptySibling(node);
                    }

                    //开始去除样式
                    var current = domUtils.getNextDomNode(bookmark.start, false, filter),
                        next;
                    while (current) {
                        if (current == bookmark.end) {
                            break;
                        }

                        next = domUtils.getNextDomNode(current, true, filter);

                        if (!dtd.$empty[current.tagName.toLowerCase()] && !domUtils.isBookmarkNode(current)) {
                            if (tagReg.test(current.tagName)) {
                                if (style) {
                                    domUtils.removeStyle(current, style);
                                    if (isRedundantSpan(current) && style != 'text-decoration') {
                                        domUtils.remove(current, true);
                                    }
                                } else {
                                    domUtils.remove(current, true);
                                }
                            } else {
                                //trace:939  不能把list上的样式去掉
                                if (!dtd.$tableContent[current.tagName] && !dtd.$list[current.tagName]) {
                                    //不排除右对齐
                                    var styles = outputSytles(current,savedStyles).join(';')
                                    domUtils.removeAttributes(current, autoFormatAttributes);
                                    if(styles){
                                         domUtils.setAttributes(current,{style:styles});
                                    }
                                   
                                    if (isRedundantSpan(current)) {
                                        domUtils.remove(current, true);
                                    }
                                }

                            }
                        }
                        current = next;
                    }
                }
                //trace:1035
                //trace:1096 不能把td上的样式去掉，比如边框
                var pN = bookmark.start.parentNode;
                if (domUtils.isBlockElm(pN) && !dtd.$tableContent[pN.tagName] && !dtd.$list[pN.tagName]) {
                    domUtils.removeAttributes(pN, autoFormatAttributes);
                }
                pN = bookmark.end.parentNode;
                if (bookmark.end && domUtils.isBlockElm(pN) && !dtd.$tableContent[pN.tagName] && !dtd.$list[pN.tagName]) {
                    domUtils.removeAttributes(pN, autoFormatAttributes);
                }
                range.moveToBookmark(bookmark).moveToBookmark(bookmark1);
                //清除冗余的代码 <b><bookmark></b>
                var node = range.startContainer,
                    tmp,
                    collapsed = range.collapsed;
                while (node.nodeType == 1 && domUtils.isEmptyNode(node) && dtd.$removeEmpty[node.tagName]) {
                    tmp = node.parentNode;
                    range.setStartBefore(node);
                    //trace:937
                    //更新结束边界
                    if (range.startContainer === range.endContainer) {
                        range.endOffset--;
                    }
                    domUtils.remove(node);
                    node = tmp;
                }

                if (!collapsed) {
                    node = range.endContainer;
                    while (node.nodeType == 1 && domUtils.isEmptyNode(node) && dtd.$removeEmpty[node.tagName]) {
                        tmp = node.parentNode;
                        range.setEndBefore(node);
                        domUtils.remove(node);

                        node = tmp;
                    }


                }
            }



            range = this.selection.getRange();
            doRemove(range);
            range.select();

        }

    };
};
