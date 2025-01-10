const Command = require('../../base/Command.js');
const emojiRegex = require('emoji-regex');

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
    // Helper function to get code points for Unicode emojis
    const toCodePoint = (emoji) => [...emoji].map((char) => char.codePointAt(0).toString(16)).join('-');

    // Match Normal Unicode Emojis
    const normalEmojis = content.match(emojiRegex());
    if (normalEmojis) {
      normalEmojis.forEach((emoji) => {
        const codePoint = toCodePoint(emoji);
        const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codePoint}.png`;
        result.push(url);
      });
    }

    // Match Client Emojis (Static and Animated)
    const clientEmojis = content.match(/<a?:\w+:(\d+)>/g);
    if (clientEmojis) {
      clientEmojis.forEach((emoji) => {
        const emojiId = emoji.match(/:(\d+)>/)[1];
        const isAnimated = emoji.startsWith('<a:');
        const url = `https://cdn.discordapp.com/emojis/${emojiId}${isAnimated ? '.gif' : '.png'}`;
        result.push(url);
      });
    }

    if (result.length === 0) {
      return this.client.util.errorEmbed(msg, 'You need to input at least one emoji.');
    }

    try {
      const emojis = result.slice(0, 10); // Limit to 10 emojis
      const text = emojis.length > 1 ? 'Here are your emojis:' : 'Here is your emoji:';
      return msg.channel.send({ content: text, files: emojis });
    } catch (error) {
      console.error('Error while processing emojis:', error);
      return msg.channel.send('An error occurred while processing your request.');
    }
  }
}

module.exports = DownloadEmoji;
