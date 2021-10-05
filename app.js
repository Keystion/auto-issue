const request = require('request');
const Sitemapper = require('sitemapper');
const cheerio = require('cheerio');
const crypto = require('crypto');

// 配置信息
const CONFIG = require('./config');

const baseUrl = `https://api.github.com/repos/${CONFIG.username}/${CONFIG.repoName}/issues`;

const sitemap = new Sitemapper();
sitemap.fetch(CONFIG.sitemapUrl)
  .then((sites) => {
    sites.sites.forEach((site) => {
      if (site.endsWith('404.html') || site.indexOf('/tags/') !== -1) {
        // console.log('跳过404');
        return;
      }
      request({
        url: site,
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
        },
      }, (err, resp, bd) => {
        if (err || resp.statusCode !== 200) { return; }
        const $ = cheerio.load(bd);
        const title = $('title').text();
        const desc = `${site}\n\n${$("meta[name='description']").attr('content')}`;
        const path = site.split('.net')[1];
        const md5 = crypto.createHash('md5');
        const label = md5.update(path).digest('hex');

        const options = {
          headers: {
            Authorization: `token ${CONFIG.token}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
            Accept: 'application/json',
          },
          url: `${baseUrl}?labels=` + `Gitalk,${label}`,
          method: 'GET',
        };
        // 检查issue是否被初始化过
        request(options, (error, response, body) => {
          if (error || response.statusCode !== 200) {
            // eslint-disable-next-line no-console
            console.log(`检查[${site}]对应评论异常`);
            return;
          }
          const jbody = JSON.parse(body);
          if (jbody.length > 0) { return; }
          // 创建issue
          const requestBody = { title, labels: ['Gitalk', label], body: desc };
          // eslint-disable-next-line no-console
          console.log(`创建内容： ${JSON.stringify(requestBody)}`);
          const createOptions = {
            headers: {
              Authorization: `token ${token}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
              Accept: 'application/json',
              'Content-Type': 'application/json;charset=UTF-8',
            },
            url: baseUrl,
            body: JSON.stringify(requestBody),
            method: 'POST',
          };
          request(createOptions, (error1, response1) => {
            if (!error1 && response1.statusCode === 201) {
              // eslint-disable-next-line no-console
              console.log(`地址: [${site}] Gitalk初始化成功`);
            }
          });
        });
      });
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(err);
  });
