package com.z7design.secured_guard.model;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import com.z7design.secured_guard.model.enums.UserStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "users")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = { "groups", "roles", "permissions" })
@EqualsAndHashCode(of = { "id" })
@JsonIgnoreProperties({ "groups", "hibernateLazyInitializer", "handler" })
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Column(nullable = false, unique = true)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Pattern(regexp = "^(?:(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*|\\d{11}@2025)$", message = "Password must be strong")
    @Column(nullable = false)
    private String password;

    @NotBlank(message = "Email is required")
    // @Email(message = "Invalid email format")
    @Column(nullable = false)
    private String email;

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100, message = "Full name must be between 3 and 100 characters")
    @Column(nullable = false)
    private String name;

    @Pattern(regexp = "^\\d{9,20}$|^$")
    @Column(nullable = true, length = 20)
    private String whatsapp;

    @Column(name = "whatsapp_consent", nullable = false)
    @Builder.Default
    private Boolean whatsappConsent = false;

    @Column(name = "whatsapp_consent_date")
    private LocalDateTime whatsappConsentDate;

    @Column(name = "whatsapp_consent_ip", length = 45)
    private String whatsappConsentIp;

    @Column(name = "whatsapp_consent_user_agent", length = 500)
    private String whatsappConsentUserAgent;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_permissions", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "permission_id"))
    @Builder.Default
    private Set<Permission> permissions = new HashSet<>();

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_group_membership", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "group_id"))
    @JsonIgnore
    @Builder.Default
    private Set<UserGroupEntity> groups = new HashSet<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "two_factor_enabled")
    @Builder.Default
    private Boolean twoFactorEnabled = false;

    @Column(name = "two_factor_whatsapp", length = 20)
    private String twoFactorWhatsapp;

    @Column(name = "require_password_change")
    @Builder.Default
    private Boolean requirePasswordChange = false;

    @Column(name = "last_password_change")
    private LocalDateTime lastPasswordChange;

    @Column(name = "first_access_completed")
    @Builder.Default
    private Boolean firstAccessCompleted = false;

    @Column(length = 500)
    private String avatar;

    @Column(length = 100)
    private String department;

    @Column(length = 100)
    private String position;

    @Column(name = "employee_code", length = 50)
    private String employeeCode;

    @Column(length = 20)
    private String phone;

    @Column(length = 500)
    private String address;

    // CPF para vinculação com a tabela employees (employees.document = users.cpf)
    @Column(length = 14)
    private String cpf;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (twoFactorEnabled == null)
            twoFactorEnabled = false;
        if (requirePasswordChange == null)
            requirePasswordChange = false;
        if (firstAccessCompleted == null)
            firstAccessCompleted = false;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Manual Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Set<UserGroupEntity> getGroups() {
        return groups;
    }

    public void setGroups(Set<UserGroupEntity> groups) {
        this.groups = groups;
    }

    public Boolean getTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Boolean getRequirePasswordChange() {
        return requirePasswordChange;
    }

    public void setRequirePasswordChange(Boolean requirePasswordChange) {
        this.requirePasswordChange = requirePasswordChange;
    }

    public Boolean getFirstAccessCompleted() {
        return firstAccessCompleted;
    }

    public void setFirstAccessCompleted(Boolean firstAccessCompleted) {
        this.firstAccessCompleted = firstAccessCompleted;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getWhatsapp() {
        return whatsapp;
    }

    public void setWhatsapp(String whatsapp) {
        this.whatsapp = whatsapp;
    }

    public Boolean getWhatsappConsent() {
        return whatsappConsent;
    }

    public void setWhatsappConsent(Boolean whatsappConsent) {
        this.whatsappConsent = whatsappConsent;
    }

    public LocalDateTime getWhatsappConsentDate() {
        return whatsappConsentDate;
    }

    public void setWhatsappConsentDate(LocalDateTime whatsappConsentDate) {
        this.whatsappConsentDate = whatsappConsentDate;
    }

    public String getWhatsappConsentIp() {
        return whatsappConsentIp;
    }

    public void setWhatsappConsentIp(String whatsappConsentIp) {
        this.whatsappConsentIp = whatsappConsentIp;
    }

    public String getWhatsappConsentUserAgent() {
        return whatsappConsentUserAgent;
    }

    public void setWhatsappConsentUserAgent(String whatsappConsentUserAgent) {
        this.whatsappConsentUserAgent = whatsappConsentUserAgent;
    }

    public String getTwoFactorWhatsapp() {
        return twoFactorWhatsapp;
    }

    public void setTwoFactorWhatsapp(String twoFactorWhatsapp) {
        this.twoFactorWhatsapp = twoFactorWhatsapp;
    }

    public LocalDateTime getLastPasswordChange() {
        return lastPasswordChange;
    }

    public void setLastPasswordChange(LocalDateTime lastPasswordChange) {
        this.lastPasswordChange = lastPasswordChange;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();
        if (roles != null) {
            for (Role role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getName()));
                if (role.getPermissions() != null) {
                    for (Permission permission : role.getPermissions()) {
                        authorities.add(new SimpleGrantedAuthority(permission.getName()));
                    }
                }
            }
        }
        if (permissions != null) {
            for (Permission permission : permissions) {
                authorities.add(new SimpleGrantedAuthority(permission.getName()));
            }
        }
        if (groups != null) {
            for (UserGroupEntity group : groups) {
                if (group.getPermissions() != null) {
                    for (String permission : group.getPermissions()) {
                        authorities.add(new SimpleGrantedAuthority(permission));
                    }
                }
            }
        }
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.BLOCKED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}