/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');

class PurgeNew extends Command {
  constructor (client) {
    super(client, {
      name: 'purge-new',
      description: 'Purge messages in a channel optionally from a member.',
      longDescription: 'Purge-New <2-100> [@member] \nPurge-new links <2-100> \nPurge-New invites <2-100> \n\nPurge-new will purge the last 2-100 messages in the channel. \nPurge-new links will purge the last 2-100 messages in the channel that contain links. \nPurge-new invites will purge the last 2-100 messages in the channel that contain invites. \n\nPurge-new can also be used to purge messages from a specific member. \n\n**Examples:** \n`purge-new 50` \n`purge-new 50 @member` \n`purge-new links 50` \n`purge-new invites 50` \n`purge-new match ? 50` \n`purge-new not ? 50` \n`purge-new startswith ? 50` \n`purge-new endswith ? 50` \n`purge-new bots 50`',
      usage: 'Purge-New <2-100> [@member]',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Purge-New <2-100> [@member]`;
    const types = ['default', 'links', 'invites', 'match', 'not', 'startswith', 'endswith', 'bots'];
    const linkRegex = /https?:\/\/[\w\d-_]/gi;
    const inviteRegex = /discord.(gg|me)\s?\//gi;
    let type = 'default';
    let count;

    if (!msg.guild.members.me.permissions.has('ManageMessages')) return msg.channel.send('The bot needs `Manage_Messages` permission to use this.');
    if (!args || args.length < 1) return msg.reply(usage);

    async function getMessages (channel, limit, filter) {
      return await channel.messages.fetch({
        limit
      }).then(messages => {
        if (filter) messages = messages.filter(filter);
        return messages;
      });
    }

    // Check if args[0] is a number
    if (parseInt(args[0], 10)) {
      count = parseInt(args[0], 10);
    } else if (types.includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    } else {
      return msg.reply(usage);
    }

    await msg.delete();

    if (type === 'default') {
      if (isNaN(count)) return msg.channel.send(`\`${count}\` is not a valid number, please input another number.`);
      if (count < 2 || count > 100) return msg.channel.send(usage);

      // If no member is mentioned
      if (!msg.mentions.members.first()) {
        return msg.channel.bulkDelete(count, true)
          .then(async messages => {
            const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${messages.size} messages from current channel. Self destructing in 5 seconds!`);
            setTimeout(() => reply.delete(), 5000);
          })
          .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
      } else {
        const mem = msg.mentions.members.first();
        return msg.channel.messages.fetch({
          limit: count
        })
          .then(function (messages) {
            messages = messages.filter(function (element) {
              return element.author === mem || element.member === mem;
            }, this);

            msg.channel.bulkDelete(messages, true)
              .then(async msg1 => {
                const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages from ${mem} in current channel. Self destructing in 5 seconds.`);
                setTimeout(() => reply.delete(), 5000);
              })
              .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
          });
      }
    }

    if (type === 'links') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(linkRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing links.');

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages containing links in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'invites') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(inviteRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing invites.');

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages containing invites in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'match') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.includes(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found containing \`${match}\`.`);

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages containing \`${match}\` in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'not') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (!content.includes(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found not containing \`${match}\`.`);

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages not containing \`${match}\` in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'startswith') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.startsWith(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found starting with \`${match}\`.`);

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages starting with \`${match}\` in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'endswith') {
      args.shift();
      const count = args.length >= 2 && isNaN(args[args.length]) ? args.pop() : 100;
      const match = args.join(' ').split('|');
      const filter = function (m) {
        const content = m.content.toLowerCase();
        for (let t of match) {
          if (content.endsWith(t.toLowerCase())) return true;
        }
        return false;
      };

      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send(`No messages found ending with \`${match}\`.`);

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages ending with \`${match}\` in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }

    if (type === 'bots') {
      const count = args[1] || 100;
      const filter = function (element) { return element.author.bot; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found from bots.');

      msg.channel.bulkDelete(messages, true)
        .then(async msg1 => {
          const reply = await msg.channel.send(`<:YES:520531392422215690> Successfully deleted ${msg1.size} messages from bots in current channel. Self destructing in 5 seconds.`);
          setTimeout(() => reply.delete(), 5000);
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
    }
  }
}

module.exports = PurgeNew;
