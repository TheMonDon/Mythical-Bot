const Command = require('../../base/Command.js');
const emojiRegex = require('emoji-regex');
const twemoji = require('twemoji');

class dlEmoji extends Command {
  constructor(client) {
    super(client, {
      name: 'download-emoji',
      description: 'Sends the image of the provided emojis',
      usage: 'download-emoji :spinnysheep:',
      category: 'Fun',
      aliases: ['dl', 'downloademoji', 'dlemoji']
    });
  }

  async run(msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`${msg.member}, you need to input at least 1 emoji.`);
    const content = args.join(' ');
    const result = [];
    let res = [];

    // Normal Emojis
    const normalEmojis = content.match(emojiRegex());
    if (normalEmojis) {
      // for (const emoji of normalEmojis) {
      normalEmojis.forEach((emoji) => {
        result.push(emoji);
      });
    }

    // Client Emojis
    let clientEmojis = content.match(/:[_a-zA-Z0-9]*>/g);
    if (clientEmojis) {
      clientEmojis = clientEmojis.map(e => e.substring(1, e.length - 1));
      clientEmojis.forEach((e) => {
        let e1 = e.replace(/[^\d]/g, '');
        const clientEmoji = this.client.emojis.resolveIdentifier(e1);
        if (clientEmoji) result.push(clientEmoji);
      })
    }

    if (result.length > 0) {
      result.forEach((emoji) => {
        if ((emoji.replace(/[^\d]/g, '')).length > 1) {
          res.push(`https://cdn.discordapp.com/emojis/${emoji.replace(/[^\d]/g, '')}${emoji.charAt(0) === 'a' ? ".gif" : ".png"}`)
        } else {
          const out = twemoji.parse(emoji);
          res.push(out.split('src="')[1].replace(/"\/>/g, ''));
        }
      });
      res = res.splice(0, 10);
      const text = res.length > 1 ? ', here are your emojis' : ', here is your emoji';
      return msg.channel.send(`${msg.member}${text}`, { files: res });
    } else {
      return msg.channel.send(`${msg.member}, you need to input at least 1 emoji.`);
    }
  }
}
module.exports = dlEmoji;
// Special credits to CoolGuy#9889 and Redi Panda_#0247