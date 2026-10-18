package com.pawanputra.bos.vendor.internal;

import com.pawanputra.bos.platform.error.ResourceNotFoundException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VendorContactService {

    private final VendorRepository vendors;
    private final VendorContactRepository contacts;

    public VendorContactService(VendorRepository vendors, VendorContactRepository contacts) {
        this.vendors = vendors;
        this.contacts = contacts;
    }

    public record ContactCmd(
            String name,
            String email,
            String phone,
            String designation,
            boolean primaryContact) {
    }

    // --- Queries ---

    @Transactional(readOnly = true)
    public List<VendorContact> listContacts(UUID organizationId, UUID vendorId) {
        requireVendor(organizationId, vendorId);
        return contacts.findAllByVendorIdOrderByPrimaryContactDescNameAsc(vendorId);
    }

    // --- Mutations ---

    public VendorContact addContact(UUID organizationId, UUID vendorId, ContactCmd cmd) {
        requireVendor(organizationId, vendorId);
        if (cmd.primaryContact()) {
            clearPrimary(vendorId);
        }
        return contacts.save(new VendorContact(
                vendorId, cmd.name(), cmd.email(), cmd.phone(), cmd.designation(), cmd.primaryContact()));
    }

    public VendorContact updateContact(UUID organizationId, UUID vendorId, UUID contactId, ContactCmd cmd) {
        requireVendor(organizationId, vendorId);
        VendorContact contact = contacts.findByIdAndVendorId(contactId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("VendorContact", contactId));
        if (cmd.primaryContact() && !contact.isPrimaryContact()) {
            clearPrimary(vendorId);
        }
        contact.setName(cmd.name());
        contact.setEmail(cmd.email());
        contact.setPhone(cmd.phone());
        contact.setDesignation(cmd.designation());
        contact.setPrimaryContact(cmd.primaryContact());
        contact.setUpdatedAt(Instant.now());
        return contacts.save(contact);
    }

    public void deleteContact(UUID organizationId, UUID vendorId, UUID contactId) {
        requireVendor(organizationId, vendorId);
        VendorContact contact = contacts.findByIdAndVendorId(contactId, vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("VendorContact", contactId));
        contacts.delete(contact);
    }

    // --- Helpers ---

    private void requireVendor(UUID organizationId, UUID vendorId) {
        vendors.findByIdAndOrganizationId(vendorId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor", vendorId));
    }

    private void clearPrimary(UUID vendorId) {
        contacts.findAllByVendorIdOrderByPrimaryContactDescNameAsc(vendorId).stream()
                .filter(VendorContact::isPrimaryContact)
                .forEach(c -> {
                    c.setPrimaryContact(false);
                    c.setUpdatedAt(Instant.now());
                    contacts.save(c);
                });
    }
}
