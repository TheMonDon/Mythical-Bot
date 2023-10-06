const Command = require('../../base/Command.js');
const pornhub = require('@justalk/pornhub-api');

class PornHub extends Command {
  constructor(client) {
    super(client, {
      name: 'pornhub',
      description: 'Sends the video result from pornhub',
      usage: 'pornhub <search>',
      category: 'NSFW',
      nsfw: true,
      aliases: ['ph', 'ch', 'cornhub'],
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

    // Search pornhub by query and get the first result
    const results = await pornhub.search(query);
    const firstResult = results.results[0];

    return msg.channel.send(firstResult.link);
  }
}

module.exports = PornHub;
