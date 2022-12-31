/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
const Command = require('../../base/Command.js');

class Purge extends Command {
  constructor (client) {
    super(client, {
      name: 'purge',
      description: 'Purge messages in a channel optionally from a member.',
      longDescription: 'Purge <2-100> [@member] \nPurge links <2-100> \nPurge invites <2-100> \n\nPurge will purge the last 2-100 messages in the channel. \nPurge links will purge the last 2-100 messages in the channel that contain links. \nPurge invites will purge the last 2-100 messages in the channel that contain invites. \n\nPurge can also be used to purge messages from a specific member. \n\n**Examples:** \n`Purge 50` \n`Purge 50 @member` \n`Purge links 50` \n`Purge invites 50` \n`Purge match ? 50` \n`Purge not ? 50` \n`Purge startswith ? 50` \n`Purge endswith ? 50` \n`Purge bots 50` \n`Purge human 50` \n`Purge images 50` \n`Purge mentions 50`',
      usage: 'Purge <2-100> [@member]',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const usage = `Incorrect Usage: ${msg.settings.prefix}Purge <2-100> [@member]`;
    const types = ['default', 'links', 'invites', 'match', 'not', 'startswith', 'endswith', 'bots', 'humans', 'images', 'mentions'];
    const linkRegex = /https?:\/\/[\w\d-_]/gi;
    const inviteRegex = /discord.(gg|me)\s?\//gi;
    let type = 'default';
    let count;

    if (!msg.guild.members.me.permissions.has('ManageMessages')) return msg.channel.send('The bot needs `Manage_Messages` permission to use this.');
    if (!args || args.length < 1) return msg.reply(usage);

    // Global function to get messages
    // channel: Channel object
    // limit: Number of messages to fetch
    // filter: Function to filter messages
    async function getMessages (channel, limit, filter) {
      return await channel.messages.fetch({
        limit
      }).then(messages => {
        if (filter) messages = messages.filter(filter);
        return messages;
      });
    }

    // Global function to delete messages
    // msg: Message object
    // messages: Collection of messages to delete
    async function deleteMessages (channel, messages, reply) {
      if (!messages || messages.size < 1) return msg.channel.send('No messages found.');

      return await channel.bulkDelete(messages, true)
        .then(async messages => {
          return messages.size;
        })
        .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
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
          .then(async msg1 => {
            return msg.channel.send(`Successfully deleted ${msg1.size} messages in current channel.`);
          })
          .catch(err => { return msg.channel.send(`An error has occurred: ${err}`); });
      } else {
        const mem = msg.mentions.members.first();
        const filter = function (element) { return element.author === mem || element.member === mem; };
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found from that member.');

        const size = deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages from ${mem.user.tag}.`);
      }
    }

    if (type === 'links') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(linkRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing links.');

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing links.`);
    }

    if (type === 'invites') {
      const count = args[1] || 100;
      const filter = function (element) { return element.content.match(inviteRegex); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found containing invites.');

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing invites.`);
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

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages containing \`${match}\`.`);
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

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages not containing \`${match}\`.`);
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

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages starting with \`${match}\`.`);
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

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages ending with \`${match}\`.`);
    }

    if (type === 'bots') {
      const count = args[1] || 100;
      const filter = function (element) { return element.author.bot; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found from bots.');

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages from bots.`);
    }

    if (type === 'human') {
      const count = args[1] || 100;
      const filter = function (element) { return !element.author.bot; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found from humans.');

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages from humans.`);
    }
    if (type === 'images') {
      const count = args[1] || 100;
      const filter = function (element) { return (element.attachments?.size) || (element.embeds?.size); };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found with images.');

      const size = deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages with images.`);
    }

    if (type === 'mentions') {
      const count = args[1] || 100;
      const filter = function (element) { return element.mentions.members.size || element.mentions.roles.size; };
      const messages = await getMessages(msg.channel, count, filter);

      if (!messages || messages.size < 1) return msg.channel.send('No messages found with mentions.');

      const size = await deleteMessages(msg.channel, messages);
      return msg.channel.send(`Successfully deleted ${size} messages with mentions.`);
    }
  }
}

module.exports = Purge;
