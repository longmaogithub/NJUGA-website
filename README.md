# 南京大学地理协会静态官网

紫色品牌、摄影与杂志排版，使用本地托管的 Bootstrap 5.3.9。网站不再嵌入 Streamlit，也没有 AI、后端、数据库、登录或 API 密钥。访问者直接读取 HTML、CSS、JavaScript 和图片，不存在应用因无人访问而休眠的问题。

## 页面

- `index.html`：协会导览、最近活动和精选文章。
- `activities.html`：活动安排与往期列表。
- `activity-*.html`：完整活动通知与原文链接。
- `journal.html`：7 篇原站推文，支持分类和关键词搜索。
- `about.html`：协会介绍、活动图集与可展开的部门分工。
- `join.html`：参与条件、参与方式及联系方式。
- `404.html`：错误页。

主要内容已直接写进 HTML。即使关闭 JavaScript，页面、文章链接、活动详情与联系方式仍可使用；移动菜单使用浏览器原生折叠控件，无需 JavaScript；JavaScript 仅增强文章筛选与复制群号。

## 部署到现有域名

本仓库根目录已经包含生成好的网页，无需在服务器安装 Node 或 Python。

1. 审查并合并静态官网 PR。
2. 在 GitHub 的仓库 Settings → Pages 中，确认发布来源为 **Deploy from a branch → main → / (root)**。如果现在已按这种方式发布，则通常不需要修改。
3. Custom domain 保持 `www.njuga.cn`，等待 GitHub Pages 部署完成并开启 Enforce HTTPS。根目录 `CNAME` 保留了此域名。
4. 若域名原本已指向此仓库，无需修改 DNS。若尚未设置，域名服务商中将 `www` 的 CNAME 指向 `longmaogithub.github.io`，不加仓库名或 URL 路径。根域名 `njuga.cn` 如需同时访问，请按 GitHub 官方文档单独配置，不要覆盖邮箱 MX 记录。
5. 用校园网与移动网络分别测试首页、活动详情、原文链接和 HTTPS。海外托管的国内访问质量需要实际确认。

这份 PR 不会自动修改 Pages 设置、DNS、主分支或旧 Streamlit 应用；合并并确认新站可用后，可在 Streamlit 控制台停止旧应用。旧 `NJUGA` 仓库保留为原始内容归档，新站运行不读取它。

官方文档：
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## 日常更新

只需 Node.js 20 或更高版本，无第三方构建依赖，不用执行 npm install。

```sh
node scripts/build.mjs
node scripts/check.mjs
```

更新文章或活动时，编辑 `data/content.json`，运行上面的命令，再将数据和生成的 HTML 一起提交。CI 会检查生成结果是否与数据一致；失败时重新构建后提交即可。

- `ARTICLE_DATA` 的键是分类。新增文章填写 `title`、`author`、`date`、`summary`、`url`、`cover`。
- `ACTIVITY_DATA` 的键是分组。每场活动填写 `title`、`date`（原通知发布日期）、`eventDate`（举办日，YYYY-MM-DD）、`slug`（唯一英文短名）、`status`、`desc`、`url`、`cover`。
- 举办日期与通知发布日期分开保存；已结束的活动不会显示“报名”按钮。活动结束后应手动更新 `status` 和分组，网站不推断报名状态。
- `desc` 保留原站正文，构建器把换行与 HTML 文本转换为安全的段落。
- 图片放在 `assets/images/`，尽量使用压缩后的 WebP。Logo 为用户提供的透明 PNG 原文件。
- 页面公共结构在 `scripts/build.mjs`；颜色和版式在 `assets/site.css`；筛选与复制在 `assets/site.js`。
- 不要只改生成后的 HTML，否则下次构建会被覆盖。

## 维护与费用

GitHub Pages 支持 GitHub Free 的公开仓库。正常协会内容站无需单独购买服务器、数据库或付费 SSL 证书，主要持续成本为域名续费。平台有容量、流量等使用限额，不是无限资源；如流量或需求变化，再评估迁移。

平时维护：续费域名、更新活动、检查外链是否仍有效、偶尔更新 Bootstrap 并测试。所有框架与图片资源随站发布，不依赖外部字体或前端 CDN。取消 AI 后没有模型 API 费用。

## 内容与第三方许可

协会文章、原文链接与图片迁自 `longmaogithub/NJUGA`，版权归原作者或协会；未经授权不得将内容用于其他用途。本次迁移没有授予内容新的开源许可。

Bootstrap 5.3.9 使用 MIT 许可证，完整许可见 `assets/vendor/BOOTSTRAP-LICENSE.txt`。视觉借鉴杂志式摄影与校园官网信息层级，未复制参考网站的源码、照片或标识。
