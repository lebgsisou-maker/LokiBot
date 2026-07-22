const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits, ModalBuilder,
    TextInputBuilder, TextInputStyle
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==================== CONFIGURATION ====================
const SALON_PUB_ID = "1527472732890075206";
const SALON_RESEAUX_ID = "1527477134145224814";

// 5 Rôles existants + 3 Nouveaux Rôles (Total 8)
const ROLES_AUTORISES = [
    "1526625483138269244", 
    "1526720313952436334", 
    "1526720034330775653", 
    "1527500185251348520", 
    "152662404745318001",
    "1528805226667053147", // Remplace par l'ID du rôle 6
    "1528805097121910976", // Remplace par l'ID du rôle 7
];

// IDs des 2 Fondateurs
const ID_FONDATEURS = ['1254877636799238257', '1526683922677629008'];

const MESSAGE_RAPPEL = "✒️ **Votre publicité doit respecter les Therms Of Service de discord ainsi que le règlement du serveur.**\n\n📝 **Votre publicité doit contenir une description, est un lien discord menant a un serveur.**\n\n🔞 **Si votre publicité contient du nswf ou autres qui contredit ou est interdit by les chartes discord sera automatiquement enlever puis sanctionner au niveau de la personnes.**\n\n⚠️ **Si vous quittez le serveur, vos publicités seront automatiquement supprimés.**\n\n*Merci de votre compréhension et bonne journée/soirée.*";

// ==================== BOT READY ====================
client.once('ready', () => {
    console.log(`✅ Le bot est en ligne ! Connecté en tant que : ${client.user.tag}`);
});

// ==================== GESTION DES MESSAGES ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. Rappel automatique pour les salons Pub et Réseaux
    if (message.channel.id === SALON_PUB_ID || message.channel.id === SALON_RESEAUX_ID) {
        const contientLien = message.content.includes("http") || message.content.includes("discord.gg") || message.attachments.size > 0;

        if (contientLien) {
            setTimeout(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('📢 RAPPEL RÈGLEMENT')
                    .setDescription(MESSAGE_RAPPEL)
                    .setColor('#FF0000')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] }).catch(() => {});
            }, 500);
        }
    }

    // 2. Commande !say (Réponse ultra-rapide < 0.5s)
    if (message.content.startsWith('!say')) {
        const textToSay = message.content.slice(4).trim();
        if (!textToSay) return;

        await message.delete().catch(() => {});
        return message.channel.send(textToSay);
    }

    // 3. Commande !setup-ticket
    if (message.content === '!setup-ticket') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('📩 SUPPORT TECHNIQUE & AIDE')
            .setDescription('Bienvenue sur le support de LOKIA.\n\nMerci de rester poli et courtois lorsque vous ouvrez un ticket.\nNotre équipe est disponible pour répondre à vos besoins.\n\n**Choisissez l\'option qui correspond à votre demande ci-dessous :**')
            .setColor('#5865F2')
            .setFooter({ text: 'Système de ticket automatisé' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_ticket')
            .setPlaceholder('Sélectionnez le motif de votre ticket...')
            .addOptions([
                { label: 'Contactez le staff', value: 'staff', description: 'Option 1 : Parler à un modérateur ou administrateur', emoji: '🔰' },
                { label: 'Partenariat & Collab', value: 'partenariat', description: 'Option 2 : Proposer une collaboration', emoji: '🤝' },
                { label: 'Signalements', value: 'signalement', description: 'Option 3 : Signaler un joueur ou un problème', emoji: '❗' },
                { label: 'Question', value: 'question', description: 'Option 4 : Poser une question générale', emoji: '❓' },
                { label: 'Passage Prioritaire', value: 'prioritaire', description: 'Option 5 : Demande urgente', emoji: '😎' }
            ]);

        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] });
        await message.delete().catch(() => {});
    }

    // 4. Commande !contester-une-décision (< 0.5s)
    if (message.content === '!contester-une-décision' || message.content === '!contester') {
        if (message.guild) {
            await message.delete().catch(() => {});
        }
        try {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('opt_rien').setLabel('Option 1 : On m\'a banni Pour Rien').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('opt_demute').setLabel('Option 2 : Je voudrais me faire demute').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('opt_sanction').setLabel('Option 3 : On m\'a mis une sanction pour rien').setStyle(ButtonStyle.Secondary)
            );
            await message.author.send({
                content: "👋 **Bienvenue dans le système de contestation de Lokia.**\nChoisis l'option qui correspond à ta situation ci-dessous :",
                components: [row]
            });
        } catch (error) {
            const alert = await message.channel.send(`❌ <@${message.author.id}>, ouvre tes MP !`);
            setTimeout(() => alert.delete().catch(() => {}), 5000);
        }
    }
});

// ==================== GESTION DES INTERACTIONS ====================
client.on('interactionCreate', async (i) => {

    // --- A. CRÉATION DU TICKET ---
    if (i.isStringSelectMenu() && i.customId === 'menu_ticket') {
        const typeTicket = i.values[0];

        // Construction des permissions (Créateur + @everyone bloqué + Les 8 Rôles autorisés)
        const permissionOverwrites = [
            { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...ROLES_AUTORISES.map(roleId => ({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
            }))
        ];

        const channel = await i.guild.channels.create({
            name: `🎫-${typeTicket}-${i.user.username}`,
            type: ChannelType.GuildText,
            topic: i.user.id,
            permissionOverwrites: permissionOverwrites
        });

        await i.reply({ content: `✅ Votre ticket a été créé ici : ${channel}`, flags: [64] });

        const embedTicket = new EmbedBuilder()
            .setTitle(`🎫 SUPPORT OUVERT - ${typeTicket.toUpperCase()}`)
            .setDescription(`Bonjour ${i.user},\n\nMerci d'avoir contacté le staff pour le motif : **${typeTicket}**.\nExpliquez en détail votre demande. Un membre de l'équipe va vous prendre en charge.\n\n⚠️ **Rappel :** Tout manque de respect envers le staff sera lourdement sanctionné.`)
            .setColor('#5865F2')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fermer_ticket').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: `${i.user}`, embeds: [embedTicket], components: [row] });
    }

    // --- B. FERMETURE DU TICKET ---
    if (i.isButton() && i.customId === 'fermer_ticket') {
        const aLeRole = i.member.roles.cache.some(r => ROLES_AUTORISES.includes(r.id));
        const estAdmin = i.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!aLeRole && !estAdmin) {
            return i.reply({ content: "❌ Seuls les membres du staff autorisés peuvent fermer ce ticket.", flags: [64] });
        }

        const modal = new ModalBuilder().setCustomId('modal_motif').setTitle('Fermeture du ticket');
        const input = new TextInputBuilder()
            .setCustomId('motif_texte')
            .setLabel('Indiquez le motif de la fermeture :')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Ex: Problème résolu...');

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);
    }

    // --- C. SOUMISSION MOTIF DE FERMETURE TICKET ---
    if (i.isModalSubmit() && i.customId === 'modal_motif') {
        const motif = i.fields.getTextInputValue('motif_texte');
        const creatorId = i.channel.topic;

        await i.reply({ content: "🔒 Fermeture et enregistrement des logs en cours...", flags: [64] });

        const fetchMessages = await i.channel.messages.fetch({ limit: 100 });
        const messagesTries = fetchMessages.reverse();

        let texteLogs = `=== HISTORIQUE DU TICKET : ${i.channel.name} ===\nFermé par : ${i.user.tag}\nMotif : ${motif}\n==============================================\n\n`;

        messagesTries.forEach(m => {
            if (!m.author.bot) {
                texteLogs += `[${m.createdAt.toLocaleTimeString('fr-FR')}] ${m.author.tag}: ${m.content}\n`;
            }
        });

        if (creatorId) {
            try {
                const membreCreateur = await i.guild.members.fetch(creatorId);
                await membreCreateur.send(`📜 **Compte-rendu de la fermeture de votre ticket**\n\n**Salon :** \`${i.channel.name}\`\n**Fermé par :** ${i.user}\n**Motif :** \`${motif}\`\n\n**__Historique des messages :__**\n\`\`\`text\n${texteLogs.slice(0, 1500)}\n\`\`\``);
            } catch (e) {
                console.log("Impossible d'envoyer le MP de fermeture au membre");
            }
        }

        setTimeout(() => {
            i.channel.delete().catch(() => {});
        }, 3000);
    }

    // --- D. CLIC BOUTONS CONTESTATION ---
    if (i.isButton() && i.customId.startsWith('opt_')) {
        const modal = new ModalBuilder().setCustomId(`formulaire_${i.customId}`).setTitle('Formulaire de contestation');
        const staffInput = new TextInputBuilder().setCustomId('form_staff').setLabel("Par qui as-tu été sanctionné(e) ?").setStyle(TextInputStyle.Short).setRequired(true);
        const raisonInput = new TextInputBuilder().setCustomId('form_raison').setLabel("Pourquoi contestes-tu ?").setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(staffInput), new ActionRowBuilder().addComponents(raisonInput));
        await i.showModal(modal);
    }

    // --- E. SOUMISSION FORMULAIRE CONTESTATION -> ENVOI FONDATEURS ---
    if (i.isModalSubmit() && i.customId.startsWith('formulaire_')) {
        const staff = i.fields.getTextInputValue('form_staff');
        const raison = i.fields.getTextInputValue('form_raison');
        let typeFinal = "Inconnu";
        if (i.customId.includes('opt_rien')) typeFinal = "Option 1 : On m'a banni Pour Rien";
        if (i.customId.includes('opt_demute')) typeFinal = "Option 2 : Je voudrais me faire demute";
        if (i.customId.includes('opt_sanction')) typeFinal = "Option 3 : On m'a mis une sanction pour rien";

        const embedFormulaire = new EmbedBuilder()
            .setColor('#00ffaa')
            .setTitle('📥 Nouvelle contestation reçue !')
            .addFields(
                { name: 'Membre :', value: `${i.user.tag} (\`${i.user.id}\`)` },
                { name: 'Option choisie :', value: typeFinal },
                { name: 'Sanctionné par :', value: staff },
                { name: 'Explications :', value: raison }
            )
            .setTimestamp();

        for (const id of ID_FONDATEURS) {
            try {
                const fondateur = await client.users.fetch(id);
                await fondateur.send({ embeds: [embedFormulaire] });
            } catch (e) { 
                console.log(`Erreur lors de l'envoi au fondateur ${id}`); 
            }
        }
        await i.reply({ content: "✅ Ta contestation a été envoyée directement aux fondateurs !", flags: [64] });
    }
});

// ==================== SERVEUR WEB EXPRESS (RENDER) ====================
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Lokia Bot est en ligne et réveillé !');
});

app.listen(port, () => {
    console.log(`Serveur de secours en cours d'exécution sur le port ${port}`);
});

// ==================== LOGIN SÉCURISÉ ====================
client.login(process.env.TOKEN);
                
