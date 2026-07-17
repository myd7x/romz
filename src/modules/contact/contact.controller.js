import * as contactService from "./contact.service.js";
import { created, noContent, ok } from "../../utils/responseHandler.js";

export const createContactMessage = async (req, res) => {
  const message = await contactService.createContactMessage(req.body, {
    user: req.user,
    req
  });

  return created(res, {
    message: "Contact message submitted",
    data: {
      message: {
        id: message._id,
        status: message.status,
        createdAt: message.createdAt
      }
    }
  });
};

export const listContactMessages = async (req, res) => {
  const { messages, meta } = await contactService.listContactMessages(req.query);

  return ok(res, {
    message: "Contact messages fetched",
    data: { messages },
    meta
  });
};

export const getContactMessageById = async (req, res) => {
  const message = await contactService.getContactMessageById(req.params.id);

  return ok(res, {
    message: "Contact message fetched",
    data: { message }
  });
};

export const updateContactMessage = async (req, res) => {
  const message = await contactService.updateContactMessage(req.params.id, req.body);

  return ok(res, {
    message: "Contact message updated",
    data: { message }
  });
};

export const deleteContactMessage = async (req, res) => {
  await contactService.deleteContactMessage(req.params.id);
  return noContent(res);
};
