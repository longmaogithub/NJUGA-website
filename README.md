# 南京大学地理协会官网与内容后台

官网保持紫色品牌和静态页面；后台使用 Sveltia CMS 0.270.0，可视化编辑文章、活动、独立页面、网站信息并上传图片。内容保存在 GitHub，发布后由 GitHub Actions 生成网页。没有常驻服务器、数据库或 AI 服务。

## 首次启用（仓库所有者操作一次）

1. 合并本次 PR。
2. 打开 [Pages 设置](https://github.com/longmaogithub/NJUGA-website/settings/pages)，将 **Source 改为 GitHub Actions**，保留域名 `www.njuga.cn`，启用 **Enforce HTTPS**。如果首次发布失败，切换 Source 后在 [Actions](https://github.com/longmaogithub/NJUGA-website/actions) 重新运行 `Check and publish website`。
3. 在仓库 Settings → Collaborators 确认只有你本人具有写权限，并检查 GitHub Apps 的授权。后台以 GitHub 仓库权限作为真正的授权边界；隐藏 `/admin/` 或网页中的用户名判断都不能替代这一点。此实现没有独立账号系统，也不开放注册或访客投稿。如果以后给其他人仓库写权限，他们也能修改网站。
4. 在 [GitHub Fine-grained tokens](https://github.com/settings/personal-access-tokens) 创建令牌：所有者 `longmaogithub`，仓库仅选 `NJUGA-website`，只授予 **Contents: Read and write**；Metadata 只读自动包含。设置到期日。不要授予所有仓库或使用账号密码登录。
5. 打开 `https://www.njuga.cn/admin/`，选择“使用访问令牌登录”，输入令牌。必须先确认 HTTPS 证书正常；HTTP 地址不会加载登录组件。不要把令牌提交到仓库、写入配置或发到聊天里。

令牌由 CMS 保存在当前浏览器中。换电脑可以使用同一有效令牌，或为设备单独创建令牌；共用电脑使用后退出并清理站点数据。可随时在 GitHub 撤销令牌。中文界面跟随浏览器语言，也可以在后台设置中切换。

## 日常使用

- **文章**：标题、作者、日期、分类、摘要、封面和正文。正文支持富文本和 Markdown。填写正文生成站内阅读页；只填写原文链接则跳转公众号等外部文章。至少填写其中一种。
- **活动**：时间、状态、封面、简介、正文和可选原始通知链接。
- **独立页面**：发布专题介绍等图文页，可选择加入主导航。建议额外导航不超过两个。不是任意 HTML/JS 网站代码托管。
- **网站设置**：首页标题、大图、协会简介、QQ群、公众号和小红书主页。
- **图片库**：上传或替换 PNG/JPG/WebP/GIF/AVIF。单文件最多 5 MB，建议压缩到 2 MB 内；新上传文件自动加随机后缀，避免重名覆盖。删除仍被使用的图片会导致构建失败。

每个条目需要一个唯一的英文 `slug`（网址标识）。发布后不要修改它；新文章地址 `article-标识.html`，活动 `activity-标识.html`，独立页面 `page-标识.html`。在官网显示开关关闭后不生成对应页面。仓库是公开的，未展示的内容与历史记录仍可在 GitHub 查看，不能存放保密稿件或敏感信息。

点击保存/发布后，等 Actions 检查及部署变绿，再刷新官网。正常需要几分钟。构建会校验内容、日期、图片、链接，并过滤文章中的脚本；检查失败时不部署，线上保持上一正常版本。按报错修改内容再保存即可。需要回退时，在 GitHub 回退对应内容提交；图片和文本均有 Git 历史。

## 源码与构建

使用 Node.js 24 和 pnpm 11.25.0：

```sh
pnpm install --frozen-lockfile
pnpm test
```

`pnpm test` 执行配置、安全和内容生命周期测试，再生成并检查站点。部署目录为 `dist/`；它仅包含实际网站、后台与资源，不包含源内容 JSON、构建脚本、依赖目录或测试数据。CMS 在登录后从 GitHub 读取内容，官网无需访问 GitHub API。

- `content/articles/*.json`：文章，一篇一文件。
- `content/activities/*.json`：活动，一场一文件。
- `content/pages/*.json`：独立页面。
- `content/settings.json`：网站信息。
- `admin/config.json`：可视化编辑字段，不含凭证。
- `scripts/build.mjs`、`scripts/content.mjs`：生成网页、验证和安全渲染。
- `.github/workflows/check.yml`：PR 只检查，主分支检查成功后部署 Pages。

仓库根目录旧 HTML 暂作为迁移前快照保留；它们不再是部署产物，也不应手动编辑。**继续使用 Deploy from a branch 会显示旧快照，后台修改不会上线。** 不再编辑 `data/content.json`；新内容只读取 `content/`。

Sveltia 及中文语言、图标字体打包到本站，不依赖前端 CDN。构建使用锁定版本及 lockfile。测试用 `test-repo` 后台仅存在于本机 QA 副本，发布配置始终为 GitHub backend，关闭 Open Authoring。

## 费用与维护

沿用 GitHub Pages 与现有域名，不需要额外购买服务器、数据库、对象存储或 SSL。维护主要是域名续费、到期令牌更新、内容更新，以及定期检查依赖和发布结果。平台容量与使用限额仍适用；不用于视频或大文件托管。后台操作需要能够访问 GitHub。

## 验证范围与许可

已验证配置符合所用 CMS 版本、构建及链接检查、输入安全和显示开关。浏览器以隔离测试仓库验证后台界面与编辑操作。正式账号登录、GitHub 写入和首次 Pages 部署必须在所有者完成上述设置后验收；不能将本地测试当作真实发布成功。

协会内容版权归原作者或协会。Bootstrap 许可见 `assets/vendor/BOOTSTRAP-LICENSE.txt`。Sveltia 及字体许可证随构建产物保留于 `admin/vendor/`；其他构建依赖许可证在安装包中。

参考：[Sveltia GitHub 登录](https://sveltiacms.app/en/docs/backends/github)、[GitHub Pages 发布方式](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。
