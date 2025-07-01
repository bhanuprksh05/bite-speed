import { Request, Response } from "express";
import { prisma } from "../server.js";
import { LinkPrecedence } from "@prisma/client";

interface ContactData{
    email?:string;
    phoneNumber?:string;
    linkPrecedence:LinkPrecedence;
    linkedId?:number;
}

export const updateIdentity = async (req: Request, res: Response) => {
    const { email, phoneNumber } = req.body;
    if(!email && !phoneNumber){
        res.status(400).json({ error: "Email or phone number is required" });
        return;
    }
    let emailEntry = email ? await prisma.contact.findFirst({
        where:{
            email:email
        },
        orderBy:{
            createdAt:"asc"
        }
    }) : null;
    let phoneEntry = phoneNumber ? await prisma.contact.findFirst({
        where:{
            phoneNumber:phoneNumber
        },
        orderBy:{
            createdAt:"asc"
        }
    }) : null;

    let contactData = [];
    if(emailEntry) contactData.push(emailEntry);
    if(phoneEntry) contactData.push(phoneEntry);

    if(contactData.length === 0){
        let contactData:ContactData = {
            linkPrecedence:LinkPrecedence.primary
        }
        if(email) contactData.email = email;
        if(phoneNumber) contactData.phoneNumber = phoneNumber;

        const newContact = await prisma.contact.create({
            data:contactData
        })
        res.status(200).json({ contact:{
            primaryContactId:newContact.id,
            emails:email ? [email] : [],
            phoneNumbers:phoneNumber ? [phoneNumber] : [],
            secondaryContactIds:[]
        } });
        return;
    }

    if(contactData.length === 1){
        let contact = contactData[0];
        let emails = new Set<string>();
        let phoneNumbers = new Set<string>();
        let secondaryContactIds:Set<number> = new Set();
        let primaryContact = await awaitInsertTillHead(contact,emails,phoneNumbers,secondaryContactIds);
        let lastContact = await awaitInsertTillTail(contact,emails,phoneNumbers,secondaryContactIds);
        let newContactData:ContactData = {
            linkPrecedence:LinkPrecedence.secondary
        }
        if(!email || !phoneNumber){
            newContactData.linkedId = primaryContact.id;
        }
        else{
            newContactData.email = email;
            emails.add(email);
            newContactData.phoneNumber = phoneNumber;
            phoneNumbers.add(phoneNumber);
            newContactData.linkedId = lastContact.id;
    
            const newContact = await prisma.contact.create({
                data:newContactData
            });
            secondaryContactIds.add(newContact.id);
        }

        res.status(200).json({ contact:{
            primaryContactId:primaryContact.id,
            emails:Array.from(emails),
            phoneNumbers:Array.from(phoneNumbers),
            secondaryContactIds:Array.from(secondaryContactIds)
        } });
        return;
    }
    else if(contactData.length > 1){
        let emails = new Set<string>();
        let phoneNumbers = new Set<string>();
        let secondaryContactIds:Set<number> = new Set();
        let firstPrimaryContact = await awaitInsertTillHead(contactData[0],emails,phoneNumbers,secondaryContactIds);
        let secondPrimaryContact = await awaitInsertTillHead(contactData[1],emails,phoneNumbers,secondaryContactIds);
        let firstLastContact = await awaitInsertTillTail(contactData[0],emails,phoneNumbers,secondaryContactIds);
        let secondLastContact = await awaitInsertTillTail(contactData[1],emails,phoneNumbers,secondaryContactIds);

        let primaryContactId;
        if(firstPrimaryContact.id !== secondPrimaryContact.id){
            if(firstPrimaryContact.createdAt > secondPrimaryContact.createdAt){
                primaryContactId = secondPrimaryContact.id;
                secondaryContactIds.add(firstPrimaryContact.id);
                let newContactData:ContactData = {
                    linkPrecedence:LinkPrecedence.secondary,
                    linkedId:secondLastContact.id
                }
                await prisma.contact.update({
                    where:{
                        id:firstPrimaryContact.id
                    },
                    data:newContactData
                })
            } 
            else{
                primaryContactId = firstPrimaryContact.id;
                secondaryContactIds.add(secondPrimaryContact.id);
                let newContactData:ContactData = {
                    linkPrecedence:LinkPrecedence.secondary,
                    linkedId:firstLastContact.id
                }
                await prisma.contact.update({
                    where:{
                        id:secondPrimaryContact.id
                    },
                    data:newContactData
                })
            }
        }

        res.status(200).json({ contact:{
            primaryContactId:primaryContactId,
            emails:Array.from(emails),
            phoneNumbers:Array.from(phoneNumbers),
            secondaryContactIds:Array.from(secondaryContactIds)
        } });
        return;
    }

}

const awaitInsertTillHead = async (contact:any,emails:Set<string>,phoneNumbers:Set<string>,secondaryContactIds:Set<number>)=>{
    emails.add(contact.email);
    phoneNumbers.add(contact.phoneNumber);

    if(contact.linkPrecedence === LinkPrecedence.primary){
        return contact
    }
    else{
        secondaryContactIds.add(contact.id);
        const contactData = await getContactData(contact.linkedId);
        if(contactData){
            return awaitInsertTillHead(contactData,emails,phoneNumbers,secondaryContactIds);
        }
        return contact;
    }

}

const awaitInsertTillTail = async (contact:any,emails:Set<string>,phoneNumbers:Set<string>,secondaryContactIds:Set<number>)=>{
    const nextContact = await prisma.contact.findFirst({
        where:{
            linkedId:contact.id
        },
        orderBy:{
            createdAt:"desc"
        }
    })
    if(nextContact){
        if(nextContact.email) emails.add(nextContact.email);
        if(nextContact.phoneNumber) phoneNumbers.add(nextContact.phoneNumber);
        secondaryContactIds.add(nextContact.id);
        return awaitInsertTillTail(nextContact,emails,phoneNumbers,secondaryContactIds);
    }
    return contact;
}



const getContactData = async (contactId:number)=>{
    const contactData = await prisma.contact.findFirst({
        where:{
            id:contactId
        }
    })
    return contactData;
}