"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var __placeImgeUrlHttps = "https";
var __emojisReg = '';
var __emojisBaseSrc = '';
var __emojis = {};
var wxDiscode_1 = require("./wxDiscode");
var htmlparser_1 = require("./htmlparser");
var block = htmlparser_1.makeMap("br,a,code,address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");
var inline = htmlparser_1.makeMap("abbr,acronym,applet,b,basefont,bdo,big,button,cite,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");
var closeSelf = htmlparser_1.makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");
function removeDOCTYPE(html) {
    return html
        .replace(/<\?xml.*\?>\n/, '')
        .replace(/<.*!doctype.*\>\n/, '')
        .replace(/<.*!DOCTYPE.*\>\n/, '');
}
function trimHtml(html) {
    return html
        .replace(/\r?\n+/g, '')
        .replace(/<!--.*?-->/ig, '')
        .replace(/\/\*.*?\*\//ig, '')
        .replace(/[ ]+</ig, '<');
}
function html2json(html, bindName) {
    html = removeDOCTYPE(html);
    html = trimHtml(html);
    html = wxDiscode_1.default.strDiscode(html);
    var bufArray = [];
    var results = {
        node: bindName,
        nodes: [],
        images: [],
        imageUrls: []
    };
    var index = 0;
    htmlparser_1.HTMLParser(html, {
        start: function (tag, attrs, unary) {
            var node = {
                node: 'element',
                tag: tag,
            };
            if (bufArray.length === 0) {
                node.index = index.toString();
                index += 1;
            }
            else {
                var parent = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                node.index = parent.index + '.' + parent.nodes.length;
            }
            if (block[tag]) {
                node.tagType = "block";
            }
            else if (inline[tag]) {
                node.tagType = "inline";
            }
            else if (closeSelf[tag]) {
                node.tagType = "closeSelf";
            }
            if (attrs.length !== 0) {
                node.attr = attrs.reduce(function (pre, attr) {
                    var name = attr.name;
                    var value = attr.value;
                    if (name == 'class') {
                        node.classStr = value;
                    }
                    if (name == 'style') {
                        node.styleStr = value;
                    }
                    if (value.match(/ /)) {
                        value = value.split(' ');
                    }
                    if (pre[name]) {
                        if (Array.isArray(pre[name])) {
                            pre[name].push(value);
                        }
                        else {
                            pre[name] = [pre[name], value];
                        }
                    }
                    else {
                        pre[name] = value;
                    }
                    return pre;
                }, {});
            }
            if (node.tag === 'img') {
                node.imgIndex = results.images.length;
                var imgUrl = node.attr ? node.attr.src : undefined;
                if (imgUrl && node.attr) {
                    imgUrl = wxDiscode_1.default.urlToHttpUrl(imgUrl, __placeImgeUrlHttps);
                    node.attr.src = imgUrl;
                    node.from = bindName;
                    results.images.push(node);
                    results.imageUrls.push(imgUrl);
                }
            }
            if (node.tag === 'font') {
                var fontSize = ['x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', '-webkit-xxx-large'];
                var styleAttrs = {
                    'color': 'color',
                    'face': 'font-family',
                    'size': 'font-size'
                };
                if (node.attr && !node.attr.style)
                    node.attr.style = [];
                if (!node.styleStr)
                    node.styleStr = '';
                for (var key in styleAttrs) {
                    if (node.attr && node.attr[key]) {
                        var value = key === 'size' ? fontSize[Number(node.attr[key]) - 1] : node.attr[key];
                        Array.isArray(node.attr.style) && node.attr.style.push(styleAttrs[key]);
                        Array.isArray(node.attr.style) && node.attr.style.push(value);
                        node.styleStr += styleAttrs[key] + ': ' + value + ';';
                    }
                }
            }
            if (node.tag === 'source') {
                results.source = node.attr ? node.attr.src : undefined;
            }
            if (unary) {
                var parent = bufArray[0] || results;
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                parent.nodes.push(node);
            }
            else {
                bufArray.unshift(node);
            }
        },
        end: function (tag) {
            var node = bufArray.shift();
            if (node.tag !== tag)
                console.error('invalid state: mismatch end tag');
            if (node.tag === 'video' && results.source) {
                node.attr.src = results.source;
                delete results.source;
            }
            if (bufArray.length === 0) {
                results.nodes.push(node);
            }
            else {
                var parent = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                parent.nodes.push(node);
            }
        },
        chars: function (text) {
            var node = {
                node: 'text',
                text: text,
                textArray: transEmojiStr(text)
            };
            if (bufArray.length === 0) {
                node.index = index.toString();
                index += 1;
                results.nodes.push(node);
            }
            else {
                var parent = bufArray[0];
                if (parent.nodes === undefined) {
                    parent.nodes = [];
                }
                node.index = parent.index + '.' + parent.nodes.length;
                parent.nodes.push(node);
            }
        },
        comment: function () {
        },
    });
    return results;
}
;
function transEmojiStr(str) {
    var emojiObjs = [];
    if (__emojisReg.length == 0 || !__emojis) {
        var emojiObj = {};
        emojiObj.node = "text";
        emojiObj.text = str;
        array = [emojiObj];
        return array;
    }
    str = str.replace(/\[([^\[\]]+)\]/g, ':$1:');
    var eReg = new RegExp("[:]");
    var array = str.split(eReg);
    for (var i = 0; i < array.length; i++) {
        var ele = array[i];
        var emojiObj = {};
        if (__emojis[ele]) {
            emojiObj.node = "element";
            emojiObj.tag = "emoji";
            emojiObj.text = __emojis[ele];
            emojiObj.baseSrc = __emojisBaseSrc;
        }
        else {
            emojiObj.node = "text";
            emojiObj.text = ele;
        }
        emojiObjs.push(emojiObj);
    }
    return emojiObjs;
}
function emojisInit(reg, baseSrc, emojis) {
    if (reg === void 0) { reg = ''; }
    if (baseSrc === void 0) { baseSrc = "/wxParse/emojis/"; }
    __emojisReg = reg;
    __emojisBaseSrc = baseSrc;
    __emojis = emojis;
}
exports.default = {
    html2json: html2json,
    emojisInit: emojisInit
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbDJqc29uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaHRtbDJqc29uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsSUFBSSxtQkFBbUIsR0FBRyxPQUFPLENBQUM7QUFDbEMsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztBQUN6QixJQUFJLFFBQVEsR0FBOEIsRUFBRSxDQUFDO0FBQzdDLHlDQUFvQztBQUNwQywyQ0FBbUQ7QUFJbkQsSUFBSSxLQUFLLEdBQUcsb0JBQU8sQ0FBQyx1VEFBdVQsQ0FBQyxDQUFDO0FBRzdVLElBQUksTUFBTSxHQUFHLG9CQUFPLENBQUMsMExBQTBMLENBQUMsQ0FBQztBQUlqTixJQUFJLFNBQVMsR0FBRyxvQkFBTyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7QUFZNUUsU0FBUyxhQUFhLENBQUMsSUFBWTtJQUNqQyxPQUFPLElBQUk7U0FDUixPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztTQUM1QixPQUFPLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDO1NBQ2hDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsSUFBWTtJQUM1QixPQUFPLElBQUk7U0FDUixPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztTQUN0QixPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztTQUMzQixPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztTQUM1QixPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFBO0FBQzVCLENBQUM7QUFHRCxTQUFTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsUUFBZ0I7SUFFL0MsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQixJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLElBQUks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5p2l6IeqOiBodHRwczovL2dpdGh1Yi5jb20vSnhjay9odG1sMmpzb25cbiAqIFxuICogXG4gKi9cbnZhciBfX3BsYWNlSW1nZVVybEh0dHBzID0gXCJodHRwc1wiO1xudmFyIF9fZW1vamlzUmVnID0gJyc7XG52YXIgX19lbW9qaXNCYXNlU3JjID0gJyc7XG52YXIgX19lbW9qaXM6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0gPSB7fTtcbmltcG9ydCB3eERpc2NvZGUgZnJvbSAnLi93eERpc2NvZGUnO1xuaW1wb3J0IHsgSFRNTFBhcnNlciwgbWFrZU1hcCB9IGZyb20gJy4vaHRtbHBhcnNlcic7XG4vLyBFbXB0eSBFbGVtZW50cyAtIEhUTUwgNVxuLy92YXIgZW1wdHkgPSBtYWtlTWFwKFwiYXJlYSxiYXNlLGJhc2Vmb250LGJyLGNvbCxmcmFtZSxocixpbWcsaW5wdXQsbGluayxtZXRhLHBhcmFtLGVtYmVkLGNvbW1hbmQsa2V5Z2VuLHNvdXJjZSx0cmFjayx3YnJcIik7XG4vLyBCbG9jayBFbGVtZW50cyAtIEhUTUwgNVxudmFyIGJsb2NrID0gbWFrZU1hcChcImJyLGEsY29kZSxhZGRyZXNzLGFydGljbGUsYXBwbGV0LGFzaWRlLGF1ZGlvLGJsb2NrcXVvdGUsYnV0dG9uLGNhbnZhcyxjZW50ZXIsZGQsZGVsLGRpcixkaXYsZGwsZHQsZmllbGRzZXQsZmlnY2FwdGlvbixmaWd1cmUsZm9vdGVyLGZvcm0sZnJhbWVzZXQsaDEsaDIsaDMsaDQsaDUsaDYsaGVhZGVyLGhncm91cCxocixpZnJhbWUsaW5zLGlzaW5kZXgsbGksbWFwLG1lbnUsbm9mcmFtZXMsbm9zY3JpcHQsb2JqZWN0LG9sLG91dHB1dCxwLHByZSxzZWN0aW9uLHNjcmlwdCx0YWJsZSx0Ym9keSx0ZCx0Zm9vdCx0aCx0aGVhZCx0cix1bCx2aWRlb1wiKTtcblxuLy8gSW5saW5lIEVsZW1lbnRzIC0gSFRNTCA1XG52YXIgaW5saW5lID0gbWFrZU1hcChcImFiYnIsYWNyb255bSxhcHBsZXQsYixiYXNlZm9udCxiZG8sYmlnLGJ1dHRvbixjaXRlLGRlbCxkZm4sZW0sZm9udCxpLGlmcmFtZSxpbWcsaW5wdXQsaW5zLGtiZCxsYWJlbCxtYXAsb2JqZWN0LHEscyxzYW1wLHNjcmlwdCxzZWxlY3Qsc21hbGwsc3BhbixzdHJpa2Usc3Ryb25nLHN1YixzdXAsdGV4dGFyZWEsdHQsdSx2YXJcIik7XG5cbi8vIEVsZW1lbnRzIHRoYXQgeW91IGNhbiwgaW50ZW50aW9uYWxseSwgbGVhdmUgb3BlblxuLy8gKGFuZCB3aGljaCBjbG9zZSB0aGVtc2VsdmVzKVxudmFyIGNsb3NlU2VsZiA9IG1ha2VNYXAoXCJjb2xncm91cCxkZCxkdCxsaSxvcHRpb25zLHAsdGQsdGZvb3QsdGgsdGhlYWQsdHJcIik7XG5cbi8vIEF0dHJpYnV0ZXMgdGhhdCBoYXZlIHRoZWlyIHZhbHVlcyBmaWxsZWQgaW4gZGlzYWJsZWQ9XCJkaXNhYmxlZFwiXG4vL3ZhciBmaWxsQXR0cnMgPSBtYWtlTWFwKFwiY2hlY2tlZCxjb21wYWN0LGRlY2xhcmUsZGVmZXIsZGlzYWJsZWQsaXNtYXAsbXVsdGlwbGUsbm9ocmVmLG5vcmVzaXplLG5vc2hhZGUsbm93cmFwLHJlYWRvbmx5LHNlbGVjdGVkXCIpO1xuXG4vLyBTcGVjaWFsIEVsZW1lbnRzIChjYW4gY29udGFpbiBhbnl0aGluZylcbi8vdmFyIHNwZWNpYWwgPSBtYWtlTWFwKFwid3h4eGNvZGUtc3R5bGUsc2NyaXB0LHN0eWxlLHZpZXcsc2Nyb2xsLXZpZXcsYmxvY2tcIik7XG5cbi8vIGZ1bmN0aW9uIHEodjogc3RyaW5nKSB7XG4vLyAgIHJldHVybiAnXCInICsgdiArICdcIic7XG4vLyB9XG5cbmZ1bmN0aW9uIHJlbW92ZURPQ1RZUEUoaHRtbDogc3RyaW5nKSB7XG4gIHJldHVybiBodG1sXG4gICAgLnJlcGxhY2UoLzxcXD94bWwuKlxcPz5cXG4vLCAnJylcbiAgICAucmVwbGFjZSgvPC4qIWRvY3R5cGUuKlxcPlxcbi8sICcnKVxuICAgIC5yZXBsYWNlKC88LiohRE9DVFlQRS4qXFw+XFxuLywgJycpO1xufVxuXG5mdW5jdGlvbiB0cmltSHRtbChodG1sOiBzdHJpbmcpIHtcbiAgcmV0dXJuIGh0bWxcbiAgICAucmVwbGFjZSgvXFxyP1xcbisvZywgJycpXG4gICAgLnJlcGxhY2UoLzwhLS0uKj8tLT4vaWcsICcnKVxuICAgIC5yZXBsYWNlKC9cXC9cXCouKj9cXCpcXC8vaWcsICcnKVxuICAgIC5yZXBsYWNlKC9bIF0rPC9pZywgJzwnKVxufVxuXG5cbmZ1bmN0aW9uIGh0bWwyanNvbihodG1sOiBzdHJpbmcsIGJpbmROYW1lOiBzdHJpbmcpIHtcbiAgLy/lpITnkIblrZfnrKbkuLJcbiAgaHRtbCA9IHJlbW92ZURPQ1RZUEUoaHRtbCk7XG4gIGh0bWwgPSB0cmltSHRtbChodG1sKTtcbiAgaHRtbCA9IHd4RGlzY29kZS5zdHJEaXNjb2RlKGh0bWwpO1xuICAvL+eUn+aIkG5vZGXoioLngrlcbiAgdmFyIGJ1ZkFycmF5OiBhbnlbXSA9IFtdO1xuICB2YXIgcmVzdWx0czogd3hQYXJzZS5JUmVzdWx0ID0ge1xuICAgIG5vZGU6IGJpbmROYW1lLFxuICAgIG5vZGVzOiBbXSxcbiAgICBpbWFnZXM6IFtdLFxuICAgIGltYWdlVXJsczogW11cbiAgfTtcbiAgdmFyIGluZGV4ID0gMDtcbiAgSFRNTFBhcnNlcihodG1sLCB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uICh0YWcsIGF0dHJzLCB1bmFyeSkge1xuICAgICAgLy9kZWJ1Zyh0YWcsIGF0dHJzLCB1bmFyeSk7XG4gICAgICAvLyBub2RlIGZvciB0aGlzIGVsZW1lbnRcbiAgICAgIHZhciBub2RlOiB3eFBhcnNlLlROb2RlID0ge1xuICAgICAgICBub2RlOiAnZWxlbWVudCcsXG4gICAgICAgIHRhZzogdGFnLFxuICAgICAgfTtcblxuICAgICAgaWYgKGJ1ZkFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBub2RlLmluZGV4ID0gaW5kZXgudG9TdHJpbmcoKVxuICAgICAgICBpbmRleCArPSAxXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyZW50ID0gYnVmQXJyYXlbMF07XG4gICAgICAgIGlmIChwYXJlbnQubm9kZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBhcmVudC5ub2RlcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIG5vZGUuaW5kZXggPSBwYXJlbnQuaW5kZXggKyAnLicgKyBwYXJlbnQubm9kZXMubGVuZ3RoXG4gICAgICB9XG5cbiAgICAgIGlmIChibG9ja1t0YWddKSB7XG4gICAgICAgIG5vZGUudGFnVHlwZSA9IFwiYmxvY2tcIjtcbiAgICAgIH0gZWxzZSBpZiAoaW5saW5lW3RhZ10pIHtcbiAgICAgICAgbm9kZS50YWdUeXBlID0gXCJpbmxpbmVcIjtcbiAgICAgIH0gZWxzZSBpZiAoY2xvc2VTZWxmW3RhZ10pIHtcbiAgICAgICAgbm9kZS50YWdUeXBlID0gXCJjbG9zZVNlbGZcIjtcbiAgICAgIH1cblxuICAgICAgaWYgKGF0dHJzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICBub2RlLmF0dHIgPSBhdHRycy5yZWR1Y2UoZnVuY3Rpb24gKHByZSwgYXR0cikge1xuICAgICAgICAgIHZhciBuYW1lID0gYXR0ci5uYW1lO1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgICAgICAgaWYgKG5hbWUgPT0gJ2NsYXNzJykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5kaXIodmFsdWUpO1xuICAgICAgICAgICAgLy8gIHZhbHVlID0gdmFsdWUuam9pbihcIlwiKVxuICAgICAgICAgICAgbm9kZS5jbGFzc1N0ciA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBoYXMgbXVsdGkgYXR0aWJ1dGVzXG4gICAgICAgICAgLy8gbWFrZSBpdCBhcnJheSBvZiBhdHRyaWJ1dGVcbiAgICAgICAgICBpZiAobmFtZSA9PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmRpcih2YWx1ZSk7XG4gICAgICAgICAgICAvLyAgdmFsdWUgPSB2YWx1ZS5qb2luKFwiXCIpXG4gICAgICAgICAgICBub2RlLnN0eWxlU3RyID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh2YWx1ZS5tYXRjaCgvIC8pKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnNwbGl0KCcgJyk7XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICAvLyBpZiBhdHRyIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgLy8gbWVyZ2UgaXRcbiAgICAgICAgICBpZiAocHJlW25hbWVdKSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcmVbbmFtZV0pKSB7XG4gICAgICAgICAgICAgIC8vIGFscmVhZHkgYXJyYXksIHB1c2ggdG8gbGFzdFxuICAgICAgICAgICAgICBwcmVbbmFtZV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBzaW5nbGUgdmFsdWUsIG1ha2UgaXQgYXJyYXlcbiAgICAgICAgICAgICAgcHJlW25hbWVdID0gW3ByZVtuYW1lXSwgdmFsdWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBub3QgZXhpc3QsIHB1dCBpdFxuICAgICAgICAgICAgcHJlW25hbWVdID0gdmFsdWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHByZTtcbiAgICAgICAgfSwge30pO1xuICAgICAgfVxuXG4gICAgICAvL+WvuWltZ+a3u+WKoOmineWkluaVsOaNrlxuICAgICAgaWYgKG5vZGUudGFnID09PSAnaW1nJykge1xuICAgICAgICBub2RlLmltZ0luZGV4ID0gcmVzdWx0cy5pbWFnZXMubGVuZ3RoO1xuICAgICAgICB2YXIgaW1nVXJsID0gbm9kZS5hdHRyID8gbm9kZS5hdHRyLnNyYyA6IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGltZ1VybCAmJiBub2RlLmF0dHIpIHtcbiAgICAgICAgICAvLyBpZiAoaW1nVXJsWzBdID09ICcnKSB7XG4gICAgICAgICAgLy8gICBpbWdVcmwuc3BsaWNlKDAsIDEpO1xuICAgICAgICAgIC8vIH1cbiAgICAgICAgICBpbWdVcmwgPSB3eERpc2NvZGUudXJsVG9IdHRwVXJsKDxzdHJpbmc+aW1nVXJsLCBfX3BsYWNlSW1nZVVybEh0dHBzKTtcbiAgICAgICAgICBub2RlLmF0dHIuc3JjID0gaW1nVXJsO1xuICAgICAgICAgIG5vZGUuZnJvbSA9IGJpbmROYW1lO1xuICAgICAgICAgIHJlc3VsdHMuaW1hZ2VzLnB1c2gobm9kZSk7XG4gICAgICAgICAgcmVzdWx0cy5pbWFnZVVybHMucHVzaChpbWdVcmwpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIOWkhOeQhmZvbnTmoIfnrb7moLflvI/lsZ7mgKdcbiAgICAgIGlmIChub2RlLnRhZyA9PT0gJ2ZvbnQnKSB7XG4gICAgICAgIHZhciBmb250U2l6ZSA9IFsneC1zbWFsbCcsICdzbWFsbCcsICdtZWRpdW0nLCAnbGFyZ2UnLCAneC1sYXJnZScsICd4eC1sYXJnZScsICctd2Via2l0LXh4eC1sYXJnZSddO1xuICAgICAgICB2YXIgc3R5bGVBdHRyczogeyBbeDogc3RyaW5nXTogc3RyaW5nIH0gPSB7XG4gICAgICAgICAgJ2NvbG9yJzogJ2NvbG9yJyxcbiAgICAgICAgICAnZmFjZSc6ICdmb250LWZhbWlseScsXG4gICAgICAgICAgJ3NpemUnOiAnZm9udC1zaXplJ1xuICAgICAgICB9O1xuICAgICAgICBpZiAobm9kZS5hdHRyICYmICFub2RlLmF0dHIuc3R5bGUpIG5vZGUuYXR0ci5zdHlsZSA9IFtdO1xuICAgICAgICBpZiAoIW5vZGUuc3R5bGVTdHIpIG5vZGUuc3R5bGVTdHIgPSAnJztcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHN0eWxlQXR0cnMpIHtcbiAgICAgICAgICBpZiAobm9kZS5hdHRyICYmIG5vZGUuYXR0cltrZXldKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBrZXkgPT09ICdzaXplJyA/IGZvbnRTaXplW051bWJlcig8c3RyaW5nPm5vZGUuYXR0cltrZXldKSAtIDFdIDogbm9kZS5hdHRyW2tleV07XG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KG5vZGUuYXR0ci5zdHlsZSkgJiYgbm9kZS5hdHRyLnN0eWxlLnB1c2goc3R5bGVBdHRyc1trZXldKTtcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkobm9kZS5hdHRyLnN0eWxlKSAmJiBub2RlLmF0dHIuc3R5bGUucHVzaCg8c3RyaW5nPnZhbHVlKTtcbiAgICAgICAgICAgIG5vZGUuc3R5bGVTdHIgKz0gc3R5bGVBdHRyc1trZXldICsgJzogJyArIHZhbHVlICsgJzsnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL+S4tOaXtuiusOW9lXNvdXJjZei1hOa6kFxuICAgICAgaWYgKG5vZGUudGFnID09PSAnc291cmNlJykge1xuICAgICAgICByZXN1bHRzLnNvdXJjZSA9IG5vZGUuYXR0ciA/IDxzdHJpbmc+bm9kZS5hdHRyLnNyYyA6IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgaWYgKHVuYXJ5KSB7XG4gICAgICAgIC8vIGlmIHRoaXMgdGFnIGRvZXNuJ3QgaGF2ZSBlbmQgdGFnXG4gICAgICAgIC8vIGxpa2UgPGltZyBzcmM9XCJob2dlLnBuZ1wiLz5cbiAgICAgICAgLy8gYWRkIHRvIHBhcmVudHNcbiAgICAgICAgdmFyIHBhcmVudCA9IGJ1ZkFycmF5WzBdIHx8IHJlc3VsdHM7XG4gICAgICAgIGlmIChwYXJlbnQubm9kZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBhcmVudC5ub2RlcyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHBhcmVudC5ub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVmQXJyYXkudW5zaGlmdChub2RlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVuZDogZnVuY3Rpb24gKHRhZykge1xuICAgICAgLy9kZWJ1Zyh0YWcpO1xuICAgICAgLy8gbWVyZ2UgaW50byBwYXJlbnQgdGFnXG4gICAgICB2YXIgbm9kZSA9IGJ1ZkFycmF5LnNoaWZ0KCk7XG4gICAgICBpZiAobm9kZS50YWcgIT09IHRhZykgY29uc29sZS5lcnJvcignaW52YWxpZCBzdGF0ZTogbWlzbWF0Y2ggZW5kIHRhZycpO1xuXG4gICAgICAvL+W9k+aciee8k+WtmHNvdXJjZei1hOa6kOaXtuS6juS6jnZpZGVv6KGl5LiKc3Jj6LWE5rqQXG4gICAgICBpZiAobm9kZS50YWcgPT09ICd2aWRlbycgJiYgcmVzdWx0cy5zb3VyY2UpIHtcbiAgICAgICAgbm9kZS5hdHRyLnNyYyA9IHJlc3VsdHMuc291cmNlO1xuICAgICAgICBkZWxldGUgcmVzdWx0cy5zb3VyY2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChidWZBcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVzdWx0cy5ub2Rlcy5wdXNoKG5vZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IGJ1ZkFycmF5WzBdO1xuICAgICAgICBpZiAocGFyZW50Lm5vZGVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwYXJlbnQubm9kZXMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBwYXJlbnQubm9kZXMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGNoYXJzOiBmdW5jdGlvbiAodGV4dCkge1xuICAgICAgLy9kZWJ1Zyh0ZXh0KTtcbiAgICAgIHZhciBub2RlOiB3eFBhcnNlLlROb2RlID0ge1xuICAgICAgICBub2RlOiAndGV4dCcsXG4gICAgICAgIHRleHQ6IHRleHQsXG4gICAgICAgIHRleHRBcnJheTogdHJhbnNFbW9qaVN0cih0ZXh0KVxuICAgICAgfTtcblxuICAgICAgaWYgKGJ1ZkFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBub2RlLmluZGV4ID0gaW5kZXgudG9TdHJpbmcoKVxuICAgICAgICBpbmRleCArPSAxXG4gICAgICAgIHJlc3VsdHMubm9kZXMucHVzaChub2RlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBidWZBcnJheVswXTtcbiAgICAgICAgaWYgKHBhcmVudC5ub2RlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGFyZW50Lm5vZGVzID0gW107XG4gICAgICAgIH1cbiAgICAgICAgbm9kZS5pbmRleCA9IHBhcmVudC5pbmRleCArICcuJyArIHBhcmVudC5ub2Rlcy5sZW5ndGhcbiAgICAgICAgcGFyZW50Lm5vZGVzLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBjb21tZW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAvL2RlYnVnKHRleHQpO1xuICAgICAgLy8gdmFyIG5vZGUgPSB7XG4gICAgICAvLyAgICAgbm9kZTogJ2NvbW1lbnQnLFxuICAgICAgLy8gICAgIHRleHQ6IHRleHQsXG4gICAgICAvLyB9O1xuICAgICAgLy8gdmFyIHBhcmVudCA9IGJ1ZkFycmF5WzBdO1xuICAgICAgLy8gaWYgKHBhcmVudC5ub2RlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyAgICAgcGFyZW50Lm5vZGVzID0gW107XG4gICAgICAvLyB9XG4gICAgICAvLyBwYXJlbnQubm9kZXMucHVzaChub2RlKTtcbiAgICB9LFxuICB9KTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59O1xuXG5mdW5jdGlvbiB0cmFuc0Vtb2ppU3RyKHN0cjogc3RyaW5nKSB7XG4gIC8vIHZhciBlUmVnID0gbmV3IFJlZ0V4cChcIltcIitfX3JlZysnICcrXCJdXCIpO1xuICAvLyAgIHN0ciA9IHN0ci5yZXBsYWNlKC9cXFsoW15cXFtcXF1dKylcXF0vZywnOiQxOicpXG5cbiAgdmFyIGVtb2ppT2JqcyA9IFtdO1xuICAvL+WmguaenOato+WImeihqOi+vuW8j+S4uuepulxuICBpZiAoX19lbW9qaXNSZWcubGVuZ3RoID09IDAgfHwgIV9fZW1vamlzKSB7XG4gICAgdmFyIGVtb2ppT2JqOiB3eFBhcnNlLlRFbW9qaSA9IHt9XG4gICAgZW1vamlPYmoubm9kZSA9IFwidGV4dFwiO1xuICAgIGVtb2ppT2JqLnRleHQgPSBzdHI7XG4gICAgYXJyYXkgPSBbZW1vamlPYmpdO1xuICAgIHJldHVybiBhcnJheTtcbiAgfVxuICAvL+i/meS4quWcsOaWuemcgOimgeiwg+aVtFxuICBzdHIgPSBzdHIucmVwbGFjZSgvXFxbKFteXFxbXFxdXSspXFxdL2csICc6JDE6JylcbiAgdmFyIGVSZWcgPSBuZXcgUmVnRXhwKFwiWzpdXCIpO1xuICB2YXIgYXJyYXk6IHd4UGFyc2UuVEVtb2ppW10gfCBzdHJpbmdbXSA9IHN0ci5zcGxpdChlUmVnKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciBlbGUgPSBhcnJheVtpXTtcbiAgICB2YXIgZW1vamlPYmo6IHd4UGFyc2UuVEVtb2ppID0ge307XG4gICAgaWYgKF9fZW1vamlzW2VsZV0pIHtcbiAgICAgIGVtb2ppT2JqLm5vZGUgPSBcImVsZW1lbnRcIjtcbiAgICAgIGVtb2ppT2JqLnRhZyA9IFwiZW1vamlcIjtcbiAgICAgIGVtb2ppT2JqLnRleHQgPSBfX2Vtb2ppc1tlbGVdO1xuICAgICAgZW1vamlPYmouYmFzZVNyYyA9IF9fZW1vamlzQmFzZVNyYztcbiAgICB9IGVsc2Uge1xuICAgICAgZW1vamlPYmoubm9kZSA9IFwidGV4dFwiO1xuICAgICAgZW1vamlPYmoudGV4dCA9IGVsZTtcbiAgICB9XG4gICAgZW1vamlPYmpzLnB1c2goZW1vamlPYmopO1xuICB9XG5cbiAgcmV0dXJuIGVtb2ppT2Jqcztcbn1cblxuZnVuY3Rpb24gZW1vamlzSW5pdChyZWcgPSAnJywgYmFzZVNyYyA9IFwiL3d4UGFyc2UvZW1vamlzL1wiLCBlbW9qaXM6IHsgW3g6IHN0cmluZ106IHN0cmluZyB9KSB7XG4gIF9fZW1vamlzUmVnID0gcmVnO1xuICBfX2Vtb2ppc0Jhc2VTcmMgPSBiYXNlU3JjO1xuICBfX2Vtb2ppcyA9IGVtb2ppcztcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBodG1sMmpzb246IGh0bWwyanNvbixcbiAgZW1vamlzSW5pdDogZW1vamlzSW5pdFxufTtcblxuIl19