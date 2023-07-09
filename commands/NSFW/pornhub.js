const Command = require('../../base/Command.js');
const cheerio = require('cheerio');
const fetch = require('node-superfetch');

class PornHub extends Command {
  constructor(client) {
    super(client, {
      name: 'pornhub',
      description: 'Sends the video result from pornhub',
      usage: 'pornhub <search>',
      category: 'NSFW',
      nsfw: true,
      aliases: ['ph', 'ch', 'cornhub'],
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

    if (!query || query.length < 1) return msg.channel.send('Please enter something to search for.');

    const { text } = await fetch
      .get('https://www.pornhub.com/video/search')
      .query({ search: query })
      .catch((err) => {
        return msg.channel.send(err);
      });
    if (text.includes('<div class="noResultsWrapper">')) return null;
    const $ = cheerio.load(text);
    const video = $('li[class="pcVideoListItem js-pop videoblock videoBox"]').eq(5);
    const url = `https://www.pornhub.com/view_video.php?viewkey=${video.attr('data-video-vkey')}`;

    return msg.channel.send(url);
  }
}

module.exports = PornHub;
