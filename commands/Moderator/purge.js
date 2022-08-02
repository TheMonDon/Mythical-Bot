const Command = require('../../base/Command.js');

class Purge extends Command {
  constructor (client) {
    super(client, {
      name: 'purge',
      description: 'Purge messages in a channel optionally from a member.',
      longDescription: 'Purge messages in current channel, optionally from a member, or a member in a different channel.',
      usage: 'purge <2-100> (@member) (@channel)',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}purge <2-100> (@member) (@channel)`;
    if (!msg.guild.members.me.permissions.has('MANAGE_MESSAGES')) return msg.channel.send('The bot needs `Manage_Messages` permission to use this.');
    if (!args || args.length < 1) return msg.reply(usage);

    msg.delete();

    const num = parseInt(args[0], 10);
    if (isNaN(num)) return msg.channel.send(`\`${num}\` is not a valid number, please input another number.`);
    if (num < 2 || num > 100) return msg.reply(usage);

    try {
      if (msg.mentions.channels.first() && msg.mentions.members.first()) {
        const chan = msg.mentions.channels.first();
        const mem = msg.mentions.members.first();
        return chan.messages.fetch({
          limit: num
        })
          .then(function (messages) {
            messages = messages.filter(function (element) {
              return element.author === mem || element.member === mem;
            }, this);
            chan.bulkDelete(messages, true)
              .then(async msg1 => {
                const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1} messages from ${mem} in ${chan}. Self destructing in 5 seconds.`);
                setTimeout(() => reply.delete(), 5000);
              });
          });
      }

      if (msg.mentions.members.first()) {
        const mem = msg.mentions.members.first();
        return msg.channel.messages.fetch({
          limit: num
        })
          .then(function (messages) {
            messages = messages.filter(function (element) {
              return element.author === mem || element.member === mem;
            }, this);
            msg.channel.bulkDelete(messages, true)
              .then(async msg1 => {
                const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages from ${mem} in current channel. Self destructing in 5 seconds.`);
                setTimeout(() => reply.delete(), 5000);
              });
          });
      }

      if (msg.mentions.channels.first()) {
        const chan = msg.mentions.channels.first();
        return chan.bulkDelete(num, true)
          .then(async messages => {
            const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${messages.size} messages from ${chan}. Self destructing in 5 seconds.`);
            setTimeout(() => reply.delete(), 5000);
          });
      }

      return msg.channel.bulkDelete(num, true)
        .then(async messages => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${messages.size} messages from current channel. Self destructing in 5 seconds!`);
          setTimeout(() => reply.delete(), 5000);
        });
    } catch (err) {
      return msg.channel.send(`An error has occurred: ${err}`);
    }
  }
}

module.exports = Purge;
