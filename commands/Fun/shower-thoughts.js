const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class showerthoughts extends Command {
  constructor (client) {
    super(client, {
      name: 'shower-thoughts',
      description: 'Get a random shower thought.',
      usage: 'shower-thoughts',
      category: 'Fun',
      Aliases: ['showerthoughts', 'st']
    });
  }

  async run (msg) {
    const { body } = await fetch
      .get('https://www.reddit.com/r/Showerthoughts.json')
      .query({ limit: 1000 });
    const allowed = msg.channel.nsfw ? body.data.children : body.data.children.filter(post => !post.data.over_18);
    if (!allowed.length) return msg.channel.send('It seems the shower thoughts are gone right now. Try again later!');
    return msg.channel.send(allowed[Math.floor(Math.random() * allowed.length)].data.title);
  }
}

module.exports = showerthoughts;
