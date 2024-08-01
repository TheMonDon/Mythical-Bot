const Command = require('../../base/Command.js');
const emojiRegex = require('emoji-regex');
const twemoji = require('twemoji');

class DownloadEmoji extends Command {
  constructor(client) {
    super(client, {
      name: 'download-emoji',
      description: 'Sends the image of the provided emojis',
      usage: 'download-emoji <emoji>',
      category: 'Fun',
      aliases: ['downloademoji'],
      examples: ['download-emoji :spinnysheep:'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const content = args.join(' ');
    const result = [];
    const res = [];

    // Normal Emojis
    const normalEmojis = content.match(emojiRegex());
    if (normalEmojis) {
      normalEmojis.forEach((emoji) => {
        result.push(emoji);
      });
    }

    // Client Emojis
    let clientEmojis = content.match(/:[_a-zA-Z0-9]*>/g);
    if (clientEmojis) {
      clientEmojis = clientEmojis.map((e) => e.substring(1, e.length - 1));
      clientEmojis.forEach((e) => {
        const e1 = e.replace(/[^\d]/g, '');
        const clientEmoji = this.client.emojis.resolveIdentifier(e1);
        if (clientEmoji) result.push(clientEmoji);
      });
    }

    if (result.length < 1) {
      return this.client.util.errorEmbed(msg, 'You need to input at least one emoji.');
    }

    result.forEach((emoji) => {
      if (emoji.replace(/[^\d]/g, '').length > 1) {
        res.push(
          `https://cdn.discordapp.com/emojis/${emoji.replace(/[^\d]/g, '')}${
            emoji.charAt(0) === 'a' ? '.gif' : '.png'
          }`,
        );
      } else {
        const out = twemoji.parse(emoji);
        res.push(out.split('src="')[1].replace(/"\/>/g, ''));
      }
    });
    const emojis = res.splice(0, 10);
    const text = emojis.length > 1 ? 'Here are your emojis:' : 'Here is your emoji:';

    return msg.channel.send({ content: text, files: emojis });
  }
}

module.exports = DownloadEmoji;
// Special credits to CoolGuy#9889 and Redi Panda_#0247
