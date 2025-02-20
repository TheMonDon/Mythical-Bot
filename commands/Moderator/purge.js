const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');

class Purge extends Command {
  constructor(client) {
    super(client, {
      name: 'purge',
      description: 'Purge messages in a channel optionally from a member.',
      longDescription: stripIndents`
        Purge will purge up to the last 1000 messages in the channel.
        Purging messages from a member will purge up to the last 100 messages in the channel.
        The other purge types will also purge up to the last 100 messages in the channel.
      `,
      usage: 'Purge <count> [user]',
      examples: [
        'purge 250',
        'purge 50 [user]',
        'purge links 50',
        'purge invites 50',
        'purge match <string> 50',
        'purge not <string> 50',
        'purge startswith <string> 50',
        'purge endswith <string> 50',
        'purge bots 50',
        'purge human 50',
        'purge images 50',
        'purge mentions 50',
        'purge before <Message ID | Message Link> 50',
        'purge after <Message ID | Message Link> 50',
      ],
      category: 'Moderator',
      permLevel: 'Moderator',
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const usage = `Incorrect Usage: \nUse \`${msg.settings.prefix}help purge\` for more information.`;
    const types = [
      'default',
      'links',
      'invites',
      'match',
      'not',
      'startswith',
      'endswith',
      'bots',
      'humans',
      'images',
      'mentions',
      'before',
      'after',
    ];
    const linkRegex = /https?:\/\/[\w\d-_]/gi;
    const inviteRegex = /discord.(gg|me)\s?\//gi;
    let type = 'default';
    let count;

    if (!msg.guild.members.me.permissions.has('ManageMessages')) {
      return this.client.util.errorEmbed(msg, 'The bot needs `Manage Messages` permission.', 'Missing Permission');
    }

    function checkCount(count) {
      if (!count) return 1;
      if (isNaN(count)) return 1;
      if (count > 100) return 100;
      if (count < 1) return 1;
      return count;
    }

    async function getMessages(channel, limit, filter, before, after) {
      return await channel.messages.fetch({ limit, before, after }).then((messages) => {
        if (filter) messages = messages.filter(filter);
        return messages;
      });
    }

    async function deleteMessages(channel, messages) {
      if (!messages || messages.size < 1) return msg.channel.send('No messages found.');
      return await channel
        .bulkDelete(messages, true)
        .then((messages) => messages.size)
        .catch((err) => {
          console.error(err);
          return 0;
        });
    }

    if (parseInt(args[0], 10)) {
      count = parseInt(args[0], 10);
    } else if (types.includes(args[0].toLowerCase())) {
      type = args[0].toLowerCase();
    } else {
      return this.client.util.errorEmbed(msg, usage);
    }

    await msg.delete();

    switch (type) {
      case 'default': {
        let total = Number(count);
        let purged = 0;
        const progress = count > 100;
        const user = args[1] ? await this.client.util.getMember(msg, args.slice(1).join(' ')) : null;

        if (count > 1000) {
          count = 1000;
          total = Number(count);
        }

        if (isNaN(count)) return msg.channel.send(`\`${count}\` is not a valid number, please input another number.`);

        if (user) {
          count = checkCount(count);
          const filter = (element) => element.author.id === user.id;
          const messages = await getMessages(msg.channel, count, filter);

          if (!messages || messages.size < 1) return msg.channel.send('No messages found from that member.');
          const size = await deleteMessages(msg.channel, messages);
          return msg.channel.send(`Successfully deleted ${size} messages from ${user.user.tag}.`);
        }

        if (count < 100) {
          const filter = (element) => !element.pinned;
          const messages = await getMessages(msg.channel, count, filter);
          const size = await deleteMessages(msg.channel, messages);
          return msg.channel.send(`Successfully deleted ${size} messages.`);
        }

        const purgeText = progress ? 'Purging messages... 0%' : 'Purging messages...';
        const purgeMsg = await msg.channel.send(purgeText);

        while (count > 0) {
          let messages = [];
          try {
            messages = await getMessages(msg.channel, Math.min(count, 100), (m) => !m.pinned, msg.id);
          } catch (e) {
            return this.error('Unable to get messages.');
          }

          await deleteMessages(msg.channel, messages);
          purged += messages.size;

          if (progress) purgeMsg.edit(`Purging messages... ${Math.ceil((purged / total) * 100)}%`).catch(() => false);
          if (!messages.size) count = 0;

          await this.client.util.wait(1100);
          count -= Math.min(count, 100);
        }

        purgeMsg.edit(`Purged ${purged} messages.`).catch(() => false);
        setTimeout(() => purgeMsg.delete().catch(() => false), 9000);
        break;
      }

      case 'links': {
        const count = args[1] || 100;
        const filter = (element) => element.content.match(linkRegex);
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found containing links.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages containing links.`);
      }

      case 'invites': {
        const count = checkCount(args[1]);
        const filter = (element) => element.content.match(inviteRegex);
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found containing invites.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages containing invites.`);
      }

      case 'match': {
        args.shift();
        let count;
        let match;
        if (args.length >= 2 && !isNaN(args[args.length - 1])) {
          count = checkCount(args.pop());
          match = args.join(' ').split('|');
        } else {
          count = 100;
          match = args.join(' ').split('|');
        }

        const filter = (m) => {
          const content = m.content.toLowerCase();
          for (const text of match) {
            if (content.includes(text.toLowerCase())) return true;
          }
          return false;
        };

        const messages = await getMessages(msg.channel, count, filter);
        if (!messages || messages.size < 1) return msg.channel.send(`No messages found containing \`${match}\`.`);
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages containing \`${match}\`.`);
      }

      case 'not': {
        args.shift();
        let count;
        let match;
        if (args.length >= 2 && !isNaN(args[args.length - 1])) {
          count = checkCount(args.pop());
          match = args.join(' ').split('|');
        } else {
          count = 100;
          match = args.join(' ').split('|');
        }

        const filter = (m) => {
          const content = m.content.toLowerCase();
          for (const text of match) {
            if (!content.includes(text.toLowerCase())) return true;
          }
          return false;
        };

        const messages = await getMessages(msg.channel, count, filter);
        if (!messages || messages.size < 1) return msg.channel.send(`No messages found not containing \`${match}\`.`);
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages not containing \`${match}\`.`);
      }

      case 'startswith': {
        args.shift();
        let count;
        let match;
        if (args.length >= 2 && !isNaN(args[args.length - 1])) {
          count = checkCount(args.pop());
          match = args.join(' ').split('|');
        } else {
          count = 100;
          match = args.join(' ').split('|');
        }

        const filter = (m) => {
          const content = m.content.toLowerCase();
          for (const text of match) {
            if (content.startsWith(text.toLowerCase())) return true;
          }
          return false;
        };

        const messages = await getMessages(msg.channel, count, filter);
        if (!messages || messages.size < 1) return msg.channel.send(`No messages found starting with \`${match}\`.`);
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages starting with \`${match}\`.`);
      }

      case 'endswith': {
        args.shift();
        let count;
        let match;
        if (args.length >= 2 && !isNaN(args[args.length - 1])) {
          count = checkCount(args.pop());
          match = args.join(' ').split('|');
        } else {
          count = 100;
          match = args.join(' ').split('|');
        }

        const filter = (m) => {
          const content = m.content.toLowerCase();
          for (const text of match) {
            if (content.endsWith(text.toLowerCase())) return true;
          }
          return false;
        };

        const messages = await getMessages(msg.channel, count, filter);
        if (!messages || messages.size < 1) return msg.channel.send(`No messages found ending with \`${match}\`.`);
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages ending with \`${match}\`.`);
      }

      case 'bots': {
        const count = checkCount(args[1]);
        const filter = (element) => element.author.bot;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found from bots.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages from bots.`);
      }

      case 'human': {
        const count = checkCount(args[1]);
        const filter = (element) => !element.author.bot;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found from humans.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages from humans.`);
      }

      case 'images': {
        const count = checkCount(args[1]);
        const filter = (element) => element.attachments?.size || element.embeds?.size;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found with images.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages with images.`);
      }

      case 'mentions': {
        const count = checkCount(args[1]);
        const filter = (element) => element.mentions.members.size || element.mentions.roles.size;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found with mentions.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages with mentions.`);
      }

      case 'before': {
        const message = await msg.channel.messages.fetch(args[1]);
        if (!message) return msg.channel.send('Message not found.');

        const count = checkCount(args[2]);
        const filter = (element) => element.createdTimestamp < message.createdTimestamp;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found before the message.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages before the message.`);
      }

      case 'after': {
        const message = await msg.channel.messages.fetch(args[1]);
        if (!message) return msg.channel.send('Message not found.');

        const count = checkCount(args[2]);
        const filter = (element) => element.createdTimestamp > message.createdTimestamp;
        const messages = await getMessages(msg.channel, count, filter);

        if (!messages || messages.size < 1) return msg.channel.send('No messages found after the message.');
        const size = await deleteMessages(msg.channel, messages);
        return msg.channel.send(`Successfully deleted ${size} messages after the message.`);
      }
    }
  }
}

module.exports = Purge;
